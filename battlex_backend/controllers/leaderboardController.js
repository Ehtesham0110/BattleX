// controllers/leaderboardController.js

// User model import
const User = require('../models/user');

exports.getTopPlayers = async (req, res) => {
  try {
    // Generate 10 placeholder entries dynamically
    const placeholderTopPlayers = Array.from({ length: 10 }, () => ({
      username: "Will be displayed soon",
      phone: "-",
      walletBalance: 0,
      totalWinnings: 0
    }));

    res.json({ topPlayers: placeholderTopPlayers });

    // Real data fetching can be uncommented later when ready
    /*
    const topPlayers = await User.find()
      .sort({ totalWinnings: -1 })
      .limit(10)
      .select('username phone walletBalance totalWinnings');

    res.json({ topPlayers });
    */

  } catch (err) {
    console.error("❌ Error fetching leaderboard:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
