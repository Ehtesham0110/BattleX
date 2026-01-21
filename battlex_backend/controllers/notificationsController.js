const User = require("../models/user");
const Notification = require("../models/notification");
const admin = require("../firebaseAdmin"); // single instance
const Tournament = require("../models/tournament"); // your tournament model
const cron = require("node-cron");

/* ----------------- Save FCM Token ----------------- */
exports.saveFcmToken = async (req, res) => {
  const { phoneNumber, fcmToken } = req.body;

  if (!phoneNumber || !fcmToken)
    return res.status(400).json({ success: false, message: "Missing fields" });

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.fcmToken = fcmToken;
    await user.save();

    console.log(`✅ FCM token saved for user: ${phoneNumber}`);
    res.json({ success: true, message: "FCM token saved successfully" });
  } catch (err) {
    console.error("❌ Error saving FCM token:", err);
    res.status(500).json({ success: false, message: "Failed to save token", error: err.toString() });
  }
};

/* ----------------- Send Notification Helper ----------------- */
exports.sendNotificationToUser = async (
  phoneNumber,
  title,
  body,
  type = "custom",
  tournamentId = null
) => {
  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      console.log(`⚠️ User not found for phone: ${phoneNumber}`);
      return null;
    }

    // Save notification to DB
    const notification = await Notification.create({
      userId: user._id,
      title,
      message: body,
      type,
      tournamentId,
    });

    // Send FCM if token exists
    if (user.fcmToken) {
      try {
        await admin.messaging().send({
          token: user.fcmToken,
          notification: { title, body },
          data: {
            type: type,
            tournamentId: tournamentId?.toString() || '',
            notificationId: notification._id.toString(),
          },
        });
        console.log(`✅ Notification sent to ${phoneNumber}: ${title}`);
      } catch (fcmError) {
        console.error(`❌ FCM Error for ${phoneNumber}:`, fcmError.message);
        // If token is invalid, remove it
        if (fcmError.code === 'messaging/registration-token-not-registered') {
          user.fcmToken = null;
          await user.save();
          console.log(`🔄 Removed invalid FCM token for ${phoneNumber}`);
        }
      }
    } else {
      console.log(`⚠️ No FCM token for user: ${phoneNumber}`);
    }

    return notification;
  } catch (err) {
    console.error("❌ Error sending notification:", err);
    return null;
  }
};

/* ----------------- API: Send Notification ----------------- */
exports.sendNotificationApi = async (req, res) => {
  const { phoneNumber, title, body, type, tournamentId } = req.body;

  if (!phoneNumber || !title || !body)
    return res.status(400).json({ success: false, message: "Missing fields" });

  try {
    const notification = await exports.sendNotificationToUser(phoneNumber, title, body, type, tournamentId);
    if (!notification)
      return res.status(404).json({ success: false, message: "User not found or no FCM token" });

    res.json({ success: true, message: "Notification sent successfully", notification });
  } catch (err) {
    console.error("❌ Error in sendNotificationApi:", err);
    res.status(500).json({ success: false, message: "Failed to send notification", error: err.toString() });
  }
};

/* ----------------- Fetch Notifications ----------------- */
exports.getNotifications = async (req, res) => {
  const { userId } = req.params;

  try {
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    res.status(500).json({ success: false, message: "Failed to fetch notifications", error: err.toString() });
  }
};

/* ----------------- Mark Notification as Read ----------------- */
exports.markAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification)
      return res.status(404).json({ success: false, message: "Notification not found" });

    res.json({ success: true, notification });
  } catch (err) {
    console.error("❌ Error marking notification as read:", err);
    res.status(500).json({ success: false, message: "Failed to mark as read", error: err.toString() });
  }
};

/* ----------------- FIXED: Schedule Tournament Reminders (30 & 10 mins) ----------------- */
exports.scheduleTournamentReminders = () => {
  // Run every minute to check for tournaments needing reminders
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const oneMinuteLater = new Date(now.getTime() + 60 * 1000);

      console.log(`🕐 [${now.toISOString()}] Checking for tournament reminders...`);

      // ✅ FIXED: Find tournaments whose precomputed notification times fall within [now, now+1min]
      const tournaments = await Tournament.find({
        $or: [
          { 
            'notificationTimes.reminder30': { 
              $gte: now, 
              $lt: oneMinuteLater 
            } 
          },
          { 
            'notificationTimes.reminder10': { 
              $gte: now, 
              $lt: oneMinuteLater 
            } 
          }
        ]
      });

      console.log(`📋 Found ${tournaments.length} tournaments needing reminders`);

      for (const tournament of tournaments) {
        const { reminder30, reminder10 } = tournament.notificationTimes || {};
        let updated = false;

        // Check for 30-minute reminders
        if (reminder30 && reminder30 >= now && reminder30 < oneMinuteLater) {
          console.log(`⏰ Processing 30min reminders for: ${tournament.title}`);
          
          for (const player of tournament.players) {
            if (player.phoneNumber && !player.notified30Min) {
              const sent = await exports.sendNotificationToUser(
                player.phoneNumber,
                '⏰ Tournament Reminder',
                `Your tournament "${tournament.title}" starts in 30 minutes! Get ready! 🎮`,
                'tournament',
                tournament._id
              );
              
              if (sent) {
                player.notified30Min = true;
                updated = true;
                console.log(`✅ 30min reminder sent to ${player.phoneNumber} for ${tournament.title}`);
              }
            }
          }
        }

        // Check for 10-minute reminders  
        if (reminder10 && reminder10 >= now && reminder10 < oneMinuteLater) {
          console.log(`🚨 Processing 10min reminders for: ${tournament.title}`);
          
          for (const player of tournament.players) {
            if (player.phoneNumber && !player.notified10Min) {
              const sent = await exports.sendNotificationToUser(
                player.phoneNumber,
                '🚨 Tournament Starting Soon!',
                `Your tournament "${tournament.title}" starts in 10 minutes! Join the room now! 🎮`,
                'tournament', 
                tournament._id
              );
              
              if (sent) {
                player.notified10Min = true;
                updated = true;
                console.log(`✅ 10min reminder sent to ${player.phoneNumber} for ${tournament.title}`);
              }
            }
          }
        }

        if (updated) {
          await tournament.save();
          console.log(`🔄 Tournament updated with notification flags: ${tournament.title}`);
        }
      }

      if (tournaments.length === 0) {
        console.log(`💤 No tournaments need reminders at this time`);
      }

    } catch (err) {
      console.error('❌ Error in scheduled tournament reminders:', err);
    }
  });
  
  console.log('✅ Tournament reminder scheduler started (30 & 10 min) - FIXED VERSION');
};

/* ----------------- Send Broadcast Notification to All Tournament Players ----------------- */
exports.sendTournamentBroadcast = async (tournamentId, title, body) => {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.error("❌ Tournament not found for broadcast");
      return false;
    }

    let successCount = 0;
    let totalPlayers = tournament.players.length;

    for (const player of tournament.players) {
      if (player.phoneNumber) {
        const notification = await exports.sendNotificationToUser(
          player.phoneNumber,
          title,
          body,
          "tournament",
          tournamentId
        );
        if (notification) successCount++;
      }
    }

    console.log(`✅ Broadcast sent to ${successCount}/${totalPlayers} players for tournament: ${tournament.title}`);
    return true;
  } catch (err) {
    console.error("❌ Error sending tournament broadcast:", err);
    return false;
  }
};

/* ----------------- API: Send Tournament Broadcast ----------------- */
exports.sendTournamentBroadcastApi = async (req, res) => {
  const { tournamentId, title, body } = req.body;

  if (!tournamentId || !title || !body) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const success = await exports.sendTournamentBroadcast(tournamentId, title, body);
    if (success) {
      res.json({ success: true, message: "Broadcast sent successfully" });
    } else {
      res.status(400).json({ success: false, message: "Failed to send broadcast" });
    }
  } catch (err) {
    console.error("❌ Error in tournament broadcast API:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};