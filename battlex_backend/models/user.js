// user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    username: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    walletBalance: {
      type: Number,
      default: 0,
    },

    // ✅ Phone verification handled by Firebase
    phoneVerified: {
      type: Boolean,
      default: false,
    },

    // ✅ FCM token (optional)
    fcmToken: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.User || mongoose.model('User', userSchema);
