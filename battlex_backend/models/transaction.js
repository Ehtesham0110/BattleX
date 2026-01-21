// ✅ FIXED: Transaction Model with IST timezone support
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  type: { type: String, enum: ['add', 'withdraw', 'deduct', 'prize'], required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  // ✅ FIXED: Remove default Date.now to manually set IST time
  date: { type: Date, required: true }
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);