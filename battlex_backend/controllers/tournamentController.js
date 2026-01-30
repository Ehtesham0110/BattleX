
// controllers/tournamentController.js
const path = require('path');
const Tournament = require('../models/tournament');
const cloudinary = require('../cloudinary');
const moment = require('moment');

const User = require('../models/user'); 
const Transaction = require('../models/transaction');
const Result = require('../models/result');
const TournamentResults = require('../models/tournamentResults'); // ✅ NEW: Import tournament results
const schedule = require('node-schedule');
const { sendNotificationToUser } = require('./notificationsController');
const streamifier = require('streamifier');

// Helper: timestamped logs
const log = (...args) => console.log(new Date().toISOString(), ...args);
const errorLog = (...args) => console.error(new Date().toISOString(), ...args);

// ✅ HELPER: Get current IST time
const getISTTime = () => {
  const now = new Date();
  // Convert UTC to IST (UTC + 5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  return new Date(now.getTime() + istOffset);
};

// Helper: Validate uploaded file
const validateFile = (file) => {
  if (!file) return { valid: false, message: "Image file is required" };
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedTypes.includes(file.mimetype)) return { valid: false, message: "Only JPEG/PNG images allowed" };
  if (file.size > 5 * 1024 * 1024) return { valid: false, message: "File size must be less than 5MB" };
  return { valid: true };
};

// ✅ Create a new tournament with Cloudinary image upload - UPDATED for prizePerKill
// ✅ Create Tournament (UTC storage + IST display + notificationTimes)
exports.createTournament = async (req, res) => {
  try {
    console.log("📌 Incoming tournament create request");
    console.log("📦 req.body:", req.body);

    const {
      title,
      description,
      game,
      gameType,
      entryFee,
      maxPlayers,
      roomId,
      roomPassword,
      rules,
      prizePool,
      timestamp,
      prizePerKill,
      perKill
    } = req.body;

    // ✅ Validate required fields
    if (!title || !entryFee || !maxPlayers || !timestamp || !req.file || !prizePool) {
      console.error("❌ Missing fields:", {
        title: !!title,
        entryFee: !!entryFee,
        maxPlayers: !!maxPlayers,
        timestamp: !!timestamp,
        prizePool: !!prizePool,
        file: !!req.file
      });
      return res.status(400).json({ error: "Missing required fields or image file" });
    }

    // ✅ Parse UTC timestamp sent from frontend
    let tournamentDateUtc;
    try {
      tournamentDateUtc = new Date(timestamp);
      if (isNaN(tournamentDateUtc.getTime())) throw new Error("Invalid date");
      console.log("✅ Tournament date parsed (UTC):", tournamentDateUtc);
    } catch (error) {
      console.error("❌ Invalid timestamp format:", timestamp);
      return res.status(400).json({ error: "Invalid timestamp format" });
    }

    // ✅ Validate gameType
    const validGameTypes = ["BR", "CS", "LONE WOLF", "SPECIAL"];
    if (!validGameTypes.includes(gameType)) {
      return res.status(400).json({ error: "Game type must be BR, CS, LONE WOLF, or SPECIAL" });
    }

    // ✅ Validate file (extension-based for mobile compatibility)
const ext = path.extname(req.file.originalname).toLowerCase();
const allowedExt = ['.jpg', '.jpeg', '.png', '.webp'];

if (!allowedExt.includes(ext)) {
  console.error('❌ Uploaded file is not an image:', ext);
  return res.status(400).json({ error: 'Upload file must be an image' });
}


    // ✅ Handle prizePerKill
    const prizePerKillValue = prizePerKill
      ? Number(prizePerKill)
      : perKill
        ? Number(perKill)
        : 0;

    if ((prizePerKill || perKill) && (isNaN(prizePerKillValue) || prizePerKillValue < 0)) {
      return res.status(400).json({ error: "Prize per kill value must be a valid positive number" });
    }

    console.log("⚡ Uploading image to Cloudinary...");
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "battlex_tournaments" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    // ✅ Convert UTC to IST for display only
    const tournamentDateIst = new Date(
      tournamentDateUtc.getTime() + (5.5 * 60 * 60 * 1000)
    );
    const formattedDate = moment(tournamentDateIst).format("DD MMM, h:mm A");

    // ✅ Precompute reminder times in UTC
    const notificationTimes = {
      reminder30: new Date(tournamentDateUtc.getTime() - 30 * 60 * 1000),
      reminder10: new Date(tournamentDateUtc.getTime() - 10 * 60 * 1000),
    };

    console.log("⏰ Notification times calculated:", notificationTimes);

    // ✅ Save tournament
    const tournament = new Tournament({
      title,
      description,
      game,
      gameType,
      entryFee: Number(entryFee),
      maxPlayers: Number(maxPlayers),
      roomId,
      roomPassword,
      prizePool: Number(prizePool),
      prizePerKill: prizePerKillValue,
      rules,
      date: formattedDate,           // 👈 IST string for UI
      dateTime: tournamentDateUtc,   // 👈 UTC for storage
      timestamp: tournamentDateUtc,  // 👈 keep for backward compatibility
      notificationTimes,             // 👈 precomputed UTC reminders
      imageFilename: uploadResult.public_id + "." + uploadResult.format,
      imageUrl: uploadResult.secure_url,
    });

    await tournament.save();
    console.log("✅ Tournament saved successfully:", {
      id: tournament._id,
      type: gameType,
      utc: tournamentDateUtc,
      ist: formattedDate,
      notifications: notificationTimes
    });

    res.status(201).json({
      message: "Tournament created successfully",
      tournament,
    });
  } catch (err) {
    console.error("❌ Error in createTournament:", err);
    res.status(500).json({ error: "Failed to create tournament" });
  }
};




// ✅ Join a tournament (works with all game types) - FIXED IST TRANSACTIONS
exports.joinTournament = async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const tournamentId = req.params.id;
    const { phoneNumber } = req.body;
    log("📝 [JOIN] Request received:", { tournamentId, phoneNumber });

    const currentUser = await User.findOne({ phoneNumber }).session(session);
    if (!currentUser) {
      errorLog("❌ User not found for join:", phoneNumber);
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "User not found" });
    }

    const tournament = await Tournament.findById(tournamentId).session(session);
    if (!tournament) {
      errorLog("❌ Tournament not found:", tournamentId);
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Tournament not found" });
    }

    log("🎮 Tournament game type:", tournament.gameType);

    const alreadyJoined = tournament.players.some(
      p => p.userId.toString() === currentUser._id.toString()
    );
    if (alreadyJoined) {
      log("⚠️ User already joined:", { userId: currentUser._id, tournamentId });
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({
        success: true,
        message: "Already joined this tournament",
        walletBalance: currentUser.walletBalance,
        tournament: { 
          ...tournament.toObject(), 
          alreadyJoined: true, 
          roomId: tournament.roomId, 
          roomPassword: tournament.roomPassword 
        },
        user: { id: currentUser._id, username: currentUser.username, phoneNumber: currentUser.phoneNumber }
      });
    }

    if (tournament.players.length >= tournament.maxPlayers) {
      errorLog("❌ Tournament full:", tournamentId);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Tournament is full" });
    }

    const entryFee = Number(tournament.entryFee || 0);
    if (entryFee > 0 && currentUser.walletBalance < entryFee) {
      errorLog("❌ Insufficient wallet balance:", { userId: currentUser._id, balance: currentUser.walletBalance, required: entryFee });
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    if (entryFee > 0) {
      currentUser.walletBalance -= entryFee;
      await currentUser.save({ session });
      log("💸 Deducted entry fee:", { userId: currentUser._id, amount: entryFee });

      // ✅ FIXED: Create transaction with IST time
      await Transaction.create([{
        user: currentUser._id,
        type: 'withdraw',
        amount: entryFee,
        description: `Joined tournament: ${tournament.title}`,
        date: getISTTime() // ✅ Add IST time
      }], { session });
      log("✅ Transaction recorded for entry fee");
    }

    // ✅ Add player with notification flags initialized
    tournament.players.push({ 
      userId: currentUser._id, 
      username: currentUser.username, 
      phoneNumber: currentUser.phoneNumber,
      notified30Min: false,
      notified10Min: false   // 🔥 updated (was notified5Min)
    });
    await tournament.save({ session });
    log("✅ Tournament updated with new player:", currentUser._id);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Successfully joined tournament",
      walletBalance: currentUser.walletBalance,
      tournament: { 
        ...tournament.toObject(), 
        alreadyJoined: true, 
        roomId: tournament.roomId, 
        roomPassword: tournament.roomPassword 
      },
      user: { id: currentUser._id, username: currentUser.username, phoneNumber: currentUser.phoneNumber }
    });
  } catch (err) {
    errorLog("❌ [JOIN] Error in joinTournament:", err);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.joinTeamTournament = async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();

  try {
    const tournamentId = req.params.id;
    const { captainPhoneNumber, teamName, members } = req.body;

    // 1️⃣ Basic validation
    if (!teamName || !Array.isArray(members) || members.length !== 3) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid team data" });
    }

    // 2️⃣ Fetch captain
    const captain = await User.findOne({ phoneNumber: captainPhoneNumber }).session(session);
    if (!captain) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Captain not found" });
    }

    // 3️⃣ Fetch tournament
    const tournament = await Tournament.findById(tournamentId).session(session);
    if (!tournament) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Ensure teams array exists (safety)
    tournament.teams = tournament.teams || [];

    // 4️⃣ Fetch team members FIRST
    const memberUsers = await User.find({
  username: { $in: members }
}).session(session);

if (memberUsers.length !== 3) {
  await session.abortTransaction();
  return res.status(400).json({
    message: "One or more Free Fire usernames are invalid"
  });
}
    if (memberUsers.length !== 3) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid team members" });
    }

    // 5️⃣ Duplicate player check (solo / team)
    const allIds = [
      captain._id.toString(),
      ...memberUsers.map(m => m._id.toString())
    ];

    const alreadyExists = tournament.players.some(p =>
      allIds.includes(p.userId.toString())
    );

    if (alreadyExists) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "One or more players already joined this tournament"
      });
    }

    // 6️⃣ Team name uniqueness check
    const teamExists = tournament.teams.some(
      t => t.teamName.toLowerCase() === teamName.toLowerCase()
    );

    if (teamExists) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Team name already taken" });
    }

    const teamSize = 4;
    const totalFee = Number(tournament.entryFee || 0) * teamSize;

    // 7️⃣ Slot availability check
    if (tournament.players.length + teamSize > tournament.maxPlayers) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Not enough slots for team" });
    }

    // 8️⃣ Wallet balance check
    if (captain.walletBalance < totalFee) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    // 9️⃣ Deduct wallet + transaction
    captain.walletBalance -= totalFee;
    await captain.save({ session });

    await Transaction.create([{
      user: captain._id,
      type: 'withdraw',
      amount: totalFee,
      description: `Team "${teamName}" joined: ${tournament.title}`,
      date: getISTTime()
    }], { session });

    // 🔟 Save team
    tournament.teams.push({
      teamName,
      captainUserId: captain._id,
      members: [captain._id, ...memberUsers.map(m => m._id)]
    });

    // 1️⃣1️⃣ Push all players (+4)
    const allPlayers = [captain, ...memberUsers];
    allPlayers.forEach(u => {
      tournament.players.push({
        userId: u._id,
        username: u.username,
        phoneNumber: u.phoneNumber,
        notified30Min: false,
        notified10Min: false
      });
    });

    await tournament.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: "Team successfully joined",
      walletBalance: captain.walletBalance,
      tournament
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ Team Join Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get players who joined a tournament
exports.getJoinedPlayers = async (req, res) => {
  try {
    const tournamentId = req.params.id;
    log("📝 Fetching joined players for tournament:", tournamentId);
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      errorLog("❌ Tournament not found while fetching joined players:", tournamentId);
      return res.status(404).json({ error: "Tournament not found" });
    }
    res.json({ players: tournament.players });
  } catch (err) {
    errorLog("❌ Error fetching joined players:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Submit match result
exports.submitResult = async (req, res) => {
  try {
    const { userId, tournamentId, kills, rank, screenshotUrl, prize } = req.body;
    log("📝 Submit result request:", { userId, tournamentId });

    const alreadySubmitted = await Result.findOne({ userId, tournamentId });
    if (alreadySubmitted) {
      log("⚠️ Result already submitted:", { userId, tournamentId });
      return res.status(409).json({ message: "Result already submitted" });
    }

    const result = new Result({ userId, tournamentId, kills, rank, prize, screenshotUrl });
    await result.save();
    log("✅ Result saved:", result._id);

    res.status(201).json({ message: "Result submitted successfully", result });
  } catch (err) {
    errorLog("❌ Error in submitResult:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Admin verifies result - FIXED IST TRANSACTIONS
exports.verifyResult = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { status } = req.body;
    log("📝 Verify result request:", { resultId, status });

    const result = await Result.findById(resultId);
    if (!result) {
      errorLog("❌ Result not found for verification:", resultId);
      return res.status(404).json({ error: "Result not found" });
    }

    if (status === 'approved') {
      const tournament = await Tournament.findById(result.tournamentId);
      const user = await User.findById(result.userId);

      if (!tournament || !user) {
        errorLog("❌ Tournament or user not found during verification:", { tournamentId: result.tournamentId, userId: result.userId });
        return res.status(404).json({ error: "Tournament or user not found" });
      }

      const prizeAmount = parseFloat(result.prize || 0);
      user.walletBalance += prizeAmount;
      await user.save();
      log("💰 Prize added to user wallet:", { userId: user._id, amount: prizeAmount });

      // ✅ FIXED: Create transaction with IST time
      await Transaction.create({ 
        user: user._id, 
        type: 'add', 
        amount: prizeAmount, 
        description: `Prize for ${tournament.title}`,
        date: getISTTime() // ✅ Add IST time
      });
      log("✅ Prize transaction recorded");
    }

    result.status = status;
    await result.save();
    log("✅ Result status updated:", { resultId, status });

    res.json({ message: `Result ${status} successfully`, result });
  } catch (err) {
    errorLog("❌ Error in verifyResult:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get all match results
exports.getAllResults = async (req, res) => {
  try {
    log("📝 Fetching all results");
    const results = await Result.find()
      .populate('userId', 'username phoneNumber')
      .populate('tournamentId', 'title date');
    res.json({ results });
  } catch (err) {
    errorLog("❌ Error fetching all results:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get match history for a user
exports.getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    log("📝 Fetching history for user:", userId);
    const results = await Result.find({ userId })
      .populate('tournamentId', 'title date time prizePool')
      .sort({ createdAt: -1 });
    res.json({ results });
  } catch (err) {
    errorLog("❌ Error fetching user history:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Fetch all tournaments (supports all game types)
exports.getAllTournaments = async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    log("📝 Fetching all tournaments for user:", phoneNumber);
    let user = null;
    if (phoneNumber) user = await User.findOne({ phoneNumber });

    const tournaments = await Tournament.find().sort({ dateTime: -1 }); // ✅ Updated sort field
    log("🎮 Found tournaments by game type:", tournaments.reduce((acc, t) => {
      acc[t.gameType] = (acc[t.gameType] || 0) + 1;
      return acc;
    }, {}));

    const response = tournaments.map(t => {
      const hasJoined = user ? t.players.some(p => p.userId.toString() === user._id.toString()) : false;
      return { ...t.toObject(), alreadyJoined: hasJoined, roomId: hasJoined ? t.roomId : null, roomPassword: hasJoined ? t.roomPassword : null };
    });

    res.status(200).json({ success: true, data: response });
  } catch (err) {
    errorLog("❌ Error fetching tournaments with join info:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tournaments" });
  }
};

// ✅ Fetch tournaments by type (UPDATED to support all 4 types)
exports.getTournamentsByType = async (req, res) => {
  try {
    const { gameType, phoneNumber } = req.query;
    log("📝 Fetching tournaments by type:", { gameType, phoneNumber });

    // ✅ Validate game type if provided
    const validGameTypes = ['BR', 'CS', 'LONE WOLF', 'SPECIAL'];
    if (gameType && !validGameTypes.includes(gameType)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid game type. Must be one of: ${validGameTypes.join(', ')}` 
      });
    }

    let user = null;
    if (phoneNumber) user = await User.findOne({ phoneNumber });

    const tournaments = gameType ? 
      await Tournament.find({ gameType }).sort({ dateTime: 1 }) : // ✅ Updated sort field
      await Tournament.find().sort({ dateTime: 1 }); // ✅ Updated sort field

    log(`🎮 Found ${tournaments.length} tournaments for type: ${gameType || 'ALL'}`);

    const response = tournaments.map(t => {
      const hasJoined = user ? t.players.some(p => p.userId.toString() === user._id.toString()) : false;
      return { 
        ...t.toObject(), 
        alreadyJoined: hasJoined, 
        roomId: hasJoined ? t.roomId : null, 
        roomPassword: hasJoined ? t.roomPassword : null 
      };
    });

    res.status(200).json({ success: true, data: response });
  } catch (err) {
    errorLog("❌ Error fetching tournaments by type:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tournaments" });
  }
};

// ✅ Get tournament details
exports.getTournamentDetails = async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { phoneNumber } = req.query;

    log("📝 Fetching tournament details:", { tournamentId, phoneNumber });

    if (!tournamentId) {
      return res.status(400).json({ success: false, message: "Tournament ID required" });
    }

    const tournament = await Tournament.findById(tournamentId).lean();
    if (!tournament) {
      errorLog("❌ Tournament not found:", tournamentId);
      return res.status(404).json({ success: false, message: "Tournament not found" });
    }

    log("🎮 Tournament details - Type:", tournament.gameType, "Title:", tournament.title);

    let alreadyJoined = false;

    if (phoneNumber) {
      try {
        const user = await User.findOne({ phoneNumber }).lean();
        if (user && Array.isArray(tournament.players)) {
          alreadyJoined = tournament.players.some(
            p => p.userId && p.userId.toString() === user._id.toString()
          );
        }
      } catch (e) {
        errorLog("❌ Failed to fetch user:", e);
        // continue silently; alreadyJoined remains false
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...tournament,
        alreadyJoined,
        roomId: alreadyJoined ? tournament.roomId : null,
        roomPassword: alreadyJoined ? tournament.roomPassword : null
      }
    });
  } catch (err) {
    errorLog("❌ Error in getTournamentDetails:", err);
    res.status(500).json({ success: false, message: "Internal server error at getTournamentDetails" });
  }
};

// ✅ Get my tournaments
exports.getMyTournaments = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const tournaments = await Tournament.find({ 'players.userId': user._id }).sort({ dateTime: 1 }); // ✅ Updated sort field
    log(`🎮 User ${userId} joined tournaments by type:`, tournaments.reduce((acc, t) => {
      acc[t.gameType] = (acc[t.gameType] || 0) + 1;
      return acc;
    }, {}));

    const now = new Date();
    const upcoming = [];
    const ended = [];

    tournaments.forEach(t => {
      if (new Date(t.dateTime) > now) { // ✅ Updated field name
        upcoming.push(t);
      } else {
        ended.push(t);
      }
    });

    res.status(200).json({
      success: true,
      data: { upcoming, ended }
    });
  } catch (err) {
    console.error("❌ Error in getMyTournaments:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
