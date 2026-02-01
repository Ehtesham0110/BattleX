const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },

  description: {
    type: String,
    required: true,
  },

  game: {
    type: String,
    default: 'Free Fire',
  },

  gameType: {
    type: String,
    enum: ['BR', 'CS', 'LONE WOLF', 'SPECIAL'],
    required: true,
  },

  date: {
    type: String,
    required: true, // IST string (for UI)
  },

  dateTime: { 
    type: Date,
    required: true, // UTC (logic & sorting)
  },

  timestamp: { 
    type: Date,
  },

  entryFee: {
    type: Number,
    required: true,
  },

  maxPlayers: {
    type: Number,
    required: true,
  },

  // ✅ ACTUAL player count (solo + team ghost slots)
  playersCount: {
    type: Number,
    default: 0,
  },

  roomId: {
    type: String,
    default: '',
  },

  roomPassword: {
    type: String,
    default: '',
  },

  prizePool: {
    type: Number,
    default: 0,
  },

  prizePerKill: { 
    type: Number,
    default: 0,
  },

  rules: {
    type: [String],
    default: ['No emulators', 'No teaming'],
  },

  // 👤 REAL APP USERS ONLY
  players: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      phoneNumber: {
        type: String,
        required: true,
      },
      notified30Min: {
        type: Boolean,
        default: false,
      },
      notified10Min: {
        type: Boolean,
        default: false,
      },
    },
  ],

  // ⏰ Notifications
  notificationTimes: {
    reminder30: { type: Date },
    reminder10: { type: Date },
  },

  imageFilename: {
    type: String,
    required: true,
  },

  imageUrl: { 
    type: String,
  },

}, { timestamps: true });


// ✅ Indexes
tournamentSchema.index({ gameType: 1 });
tournamentSchema.index({ dateTime: 1 });
tournamentSchema.index({ playersCount: 1 });
tournamentSchema.index({ 'players.userId': 1 });

module.exports =
  mongoose.models.Tournament ||
  mongoose.model('Tournament', tournamentSchema);
