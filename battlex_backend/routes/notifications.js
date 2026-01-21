
const express = require("express");
const router = express.Router();

const {
  saveFcmToken,
  sendNotificationApi,
  getNotifications,
  markAsRead,
  sendTournamentBroadcastApi,
} = require("../controllers/notificationsController");

const admin = require("../firebaseAdmin"); // Single Firebase instance

// 🔹 Save FCM token
router.post("/fcm-token", saveFcmToken);

// 🔹 Send notification to specific user (phoneNumber)
router.post("/send-to-user", sendNotificationApi);

// 🔹 Send broadcast notification to all tournament players
router.post("/tournament-broadcast", sendTournamentBroadcastApi);

// 🔹 Fetch all notifications for a user
router.get("/:userId", getNotifications);

// 🔹 Mark a notification as read
router.patch("/:id/mark-read", markAsRead);

// 🔹 Test notification (directly with fcmToken)
router.post("/test-notification", async (req, res) => {
  const { fcmToken, title, body } = req.body;

  if (!fcmToken || !title || !body) {
    return res.status(400).json({
      success: false,
      message: "Missing fields: fcmToken, title, body",
    });
  }

  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: {
        type: "test",
        timestamp: new Date().toISOString(),
      },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ Test notification sent:", response);

    res.json({
      success: true,
      message: "Test notification sent successfully",
      response,
    });
  } catch (error) {
    console.error("❌ Error sending test notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send notification",
      error: error.toString(),
    });
  }
});

module.exports = router;
