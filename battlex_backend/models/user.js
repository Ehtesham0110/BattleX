  //user.js
  const mongoose = require('mongoose');

  const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    walletBalance: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    otp: String,
    otpExpiry: Date,

    // ✅ FCM token
    fcmToken: { type: String },

    transactions: [
      {
        type: { type: String, enum: ['add', 'withdraw'], required: true },
        amount: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ]
  }, { timestamps: true });

  module.exports = mongoose.models.user || mongoose.model('user', userSchema);
