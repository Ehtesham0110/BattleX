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
    enum: ['BR', 'CS', 'LONE WOLF', 'SPECIAL'], // ✅ All game types supported
    required: true,
  },
  date: {
    type: String, // "04 Aug, 6:00PM" - for display purposes (IST string)
    required: true,
  },
  dateTime: { 
    type: Date, // ✅ Stored in UTC for filtering/sorting
    required: true,
  },
  timestamp: { 
    type: Date, // ✅ Kept for backward compatibility
  },
  entryFee: {
    type: Number,
    required: true,
  },
  maxPlayers: {
    type: Number,
    required: true,
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
  players: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
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
      // ✅ Notification flags
      notified30Min: {
        type: Boolean,
        default: false,
      },
      notified10Min: {   // 🔥 renamed from notified5Min → matches scheduler
        type: Boolean,
        default: false,
      },
    },
  ],
  // ✅ Precomputed notification times
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

// ✅ Indexes for performance
tournamentSchema.index({ gameType: 1 });
tournamentSchema.index({ dateTime: 1 });
tournamentSchema.index({ 'players.userId': 1 });

module.exports = mongoose.models.Tournament || mongoose.model('Tournament', tournamentSchema);
