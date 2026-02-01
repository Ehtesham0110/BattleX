//team.js
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },

  teamName: {
    type: String,
    required: true,
  },

  captain: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: String,
    phoneNumber: String,
  },

  members: [
    {
      ffUsername: {
        type: String,
        required: true,
      },
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Team', teamSchema);
