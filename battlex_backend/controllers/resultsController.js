const Result = require('../models/result');
const Tournament = require('../models/tournament');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const cloudinary = require('../cloudinary');

/**
 * Helper: Upload a buffer to Cloudinary
 * @param {Buffer} buffer
 * @param {string} folder
 * @returns {Promise<Object>}
 */
const uploadToCloudinary = (buffer, folder = 'battlex/screenshots') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

// -------------------
// 1. Submit Result (JSON or frontend)
// -------------------
exports.submitResult = async (req, res) => {
  try {
    const { userId, tournamentId, kills, rank, screenshotUrl } = req.body;
    if (!userId || !tournamentId)
      return res.status(400).json({ error: "User ID and Tournament ID required" });

    // Check if result already exists
    const existing = await Result.findOne({ userId, tournamentId });
    if (existing) return res.status(400).json({ message: "Result already submitted" });

    const tournament = await Tournament.findById(tournamentId);
    const prizeAmount = parseInt(tournament?.prizePool ?? 0, 10);

    const result = new Result({
      userId,
      tournamentId,
      kills,
      rank,
      prize: prizeAmount,
      screenshotUrl,
      status: 'pending',
      submittedAt: new Date(),
    });

    await result.save();
    res.status(201).json({ message: 'Result submitted successfully', result });
  } catch (err) {
    console.error('❌ Error submitting result:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// -------------------
// 2. Upload Result with Cloudinary (memory)
// -------------------
exports.uploadResult = async (req, res) => {
  try {
    const { userId, tournamentId, kills, rank } = req.body;
    if (!userId || !tournamentId || kills === undefined || rank === undefined)
      return res.status(400).json({ success: false, message: 'Missing fields' });

    const exists = await Result.findOne({ userId, tournamentId });
    if (exists) return res.status(409).json({ success: false, message: 'Already submitted' });

    let screenshotUrl = null;
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer);
        screenshotUrl = uploadResult.secure_url;
      } catch (cloudErr) {
        console.error('❌ Cloudinary upload error:', cloudErr);
        return res.status(500).json({ success: false, message: 'Failed to upload screenshot' });
      }
    }

    const tournament = await Tournament.findById(tournamentId);
    const prizeAmount = parseInt(tournament?.prizePool ?? 0, 10);

    const result = new Result({
      userId,
      tournamentId,
      kills,
      rank,
      prize: prizeAmount,
      screenshotUrl: screenshotUrl || null,
      status: 'pending',
      submittedAt: new Date(),
    });

    await result.save();
    res.status(201).json({ success: true, result });
  } catch (err) {
    console.error('❌ Result upload error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// -------------------
// 3. Admin Verify Result
// -------------------

exports.verifyResult = async (resultId, status) => {
  // Yeh function backend routes me call ke liye reusable hai
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('Invalid status');
  }

  const result = await Result.findById(resultId);
  if (!result) {
    return null; // caller ko pata chale ki result not found
  }

  if (status === 'approved') {
    const tournament = await Tournament.findById(result.tournamentId);
    const user = await User.findById(result.userId);

    if (!tournament || !user) {
      throw new Error('User or Tournament not found');
    }

    // Update wallet
    user.walletBalance += parseInt(result.prize, 10);
    await user.save();

    // Create transaction
    await Transaction.create({
      user: user._id,
      type: 'add',
      amount: result.prize,
      reason: `Prize for ${tournament.title}`,
    });
  }

  // Update result status
  result.status = status;
  await result.save();

  return result;
};

// ---------------------------
// Express route wrapper
// ---------------------------
exports.verifyResultRoute = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { status } = req.body;

    const updatedResult = await exports.verifyResult(resultId, status);

    if (!updatedResult) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    res.json({
      success: true,
      message: `Result ${status} successfully`,
      result: updatedResult,
    });
  } catch (err) {
    console.error('❌ Error verifying result:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};


// -------------------
// 4. Get all Results
// -------------------
exports.getAllResults = async (req, res) => {
  try {
    const results = await Result.find()
      .populate('userId', 'username phoneNumber')
      .populate('tournamentId', 'title date prizePool');

    const shaped = results.map(r => ({
      _id: r._id,
      user: r.userId?.username ?? 'Unknown',
      phone: r.userId?.phoneNumber ?? '',
      tournament: r.tournamentId?.title ?? 'Unknown',
      date: r.tournamentId?.date ?? '',
      rank: r.rank,
      kills: r.kills,
      prize: r.prize,
      status: r.status ?? 'pending',
      submittedAt: r.submittedAt,
      screenshotUrl: r.screenshotUrl ?? null,
    }));

    res.json({ results: shaped });
  } catch (err) {
    console.error("❌ Error fetching results:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// -------------------
// 5. Get User Match History
// -------------------
exports.getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const results = await Result.find({ userId })
      .populate('tournamentId', 'title date prize prizePool')
      .sort({ submittedAt: -1 });

    const now = new Date();
    const shaped = results.map(r => {
      const submittedAt = r.submittedAt || new Date();
      const totalMinutes = Math.max(0, Math.floor((24 * 60) - ((now - submittedAt) / (1000 * 60))));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      return {
        _id: r._id,
        userId: r.userId,
        tournamentId: r.tournamentId?._id ?? r.tournamentId,
        tournamentName: r.tournamentId?.title ?? 'Unknown',
        date: r.tournamentId?.date ?? '',
        rank: r.rank,
        kills: r.kills,
        prize: r.prize ?? r.tournamentId?.prize ?? r.tournamentId?.prizePool ?? 0,
        status: r.status ?? 'pending',
        submittedAt,
        remainingHours: hours,
        remainingMinutes: minutes,
        screenshotUrl: r.screenshotUrl ?? null,
      };
    });

    res.json({ results: shaped });
  } catch (err) {
    console.error('❌ Error fetching user match history:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// -------------------
// 6. Get Pending Results
// -------------------
exports.getPendingResults = async (req, res) => {
  try {
    const results = await Result.find({ status: 'pending' })
      .populate('userId', 'username phoneNumber')
      .populate('tournamentId', 'title date prizePool');


    const shaped = results.map(r => ({
      _id: r._id,
      userId: r.userId?._id ?? null,
      username: r.userId?.username ?? 'Unknown',
      phoneNumber: r.userId?.phoneNumber ?? '',
      tournamentId: r.tournamentId?._id ?? null,
      tournamentName: r.tournamentId?.title ?? 'Unknown',
      date: r.tournamentId?.date ?? '',
      rank: r.rank,
      kills: r.kills,
      prize: r.prize,
      submittedAt: r.submittedAt,
      screenshotUrl: r.screenshotUrl ?? null,
      status: r.status ?? 'pending',
    }));

    res.json({ results: shaped });
  } catch (err) {
    console.error('❌ Error fetching pending results:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// -------------------
// 7. Leaderboard
// -------------------
exports.getLeaderboard = async (req, res) => {
  try {
    // Top by kills
    const topByKills = await Result.aggregate([
      { $group: { _id: '$userId', totalKills: { $sum: '$kills' } } },
      { $sort: { totalKills: -1 } },
      { $limit: 10 },
    ]);

    // Top by prize
    const topByPrize = await Result.aggregate([
      { $group: { _id: '$userId', totalPrize: { $sum: '$prize' } } },
      { $sort: { totalPrize: -1 } },
      { $limit: 10 },
    ]);

    const populateUsers = async (list) =>
      Promise.all(
        list.map(async (entry) => {
          const user = await User.findById(entry._id).select('username phoneNumber');
          return {
            userId: entry._id,
            username: user?.username || 'Unknown',
            phoneNumber: user?.phoneNumber || '',
            ...entry,
          };
        })
      );

    const killsLeaderboard = await populateUsers(topByKills);
    const prizeLeaderboard = await populateUsers(topByPrize);

    res.json({
      success: true,
      killsLeaderboard,
      prizeLeaderboard,
    });
  } catch (err) {
    console.error('❌ Error fetching leaderboard:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
