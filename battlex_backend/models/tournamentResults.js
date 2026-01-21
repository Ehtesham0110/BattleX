
const mongoose = require('mongoose');

const tournamentResultsSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    unique: true, // One result record per tournament
  },
  winners: [
    {
      playerName: {
        type: String,
        required: true,
      },
      kills: {
        type: Number,
        required: true,
        default: 0,
      },
      prize: {
        type: Number,
        default: 0,
      },
      position: {
        type: Number,
        default: 1,
      }
    }
  ],
  matchResults: [
    {
      playerName: {
        type: String,
        required: true,
      },
      kills: {
        type: Number,
        required: true,
        default: 0,
      },
      position: {
        type: Number,
        default: 0,
      }
    }
  ],
  updatedBy: {
    type: String, // Admin user ID who last updated the results
    required: true,
  },
  adminNotes: {
    type: String,
    default: '',
  }
}, { 
  timestamps: true // This adds createdAt and updatedAt fields
});

// Add indexes for better query performance
tournamentResultsSchema.index({ tournamentId: 1 });
tournamentResultsSchema.index({ updatedBy: 1 });

module.exports = mongoose.model('TournamentResults', tournamentResultsSchema);
