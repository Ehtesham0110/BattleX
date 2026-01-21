const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  kills: Number,
  rank: Number,
  prize: Number
}, { timestamps: true });

// âœ… Safe export to prevent OverwriteModelError
module.exports = mongoose.models.Player || mongoose.model('Player', playerSchema);

