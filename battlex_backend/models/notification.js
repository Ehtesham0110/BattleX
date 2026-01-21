const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // jis user ko notification bhejna hai
    required: false, // agar broadcast hai toh userId null rahega
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["tournament", "system", "custom"],
    default: "system",
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tournament",
    required: false, // sirf tournament related notifications ke liye
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  scheduledFor: {
    type: Date, // agar notification ko schedule karna hai (jaise 10 min pehle)
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
