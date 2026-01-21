const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  kills: {
    type: Number,
    required: true
  },
  rank: {
    type: Number,
    required: true
  },
  prize: {
    type: Number,
    default: 0
  },
  screenshotUrl: {
    type: String, // Local filename or cloud URL
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true }); // auto add createdAt & updatedAt

// ✅ Safe export to avoid OverwriteModelError
module.exports = mongoose.models.Result || mongoose.model('Result', resultSchema);
