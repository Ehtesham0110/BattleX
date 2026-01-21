// routes/leaderboard.js

const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');

router.get('/top', leaderboardController.getTopPlayers);

module.exports = router;

