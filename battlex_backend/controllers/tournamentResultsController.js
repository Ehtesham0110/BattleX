
const TournamentResults = require('../models/tournamentResults');
const Tournament = require('../models/tournament');

// Helper: timestamped logs
const log = (...args) => console.log(new Date().toISOString(), ...args);
const errorLog = (...args) => console.error(new Date().toISOString(), ...args);

// ✅ Get tournament results by tournament ID
exports.getTournamentResults = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    log("📝 Fetching tournament results for:", tournamentId);

    // Validate tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      errorLog("❌ Tournament not found:", tournamentId);
      return res.status(404).json({ 
        success: false, 
        message: "Tournament not found" 
      });
    }

    // Fetch tournament results
    const results = await TournamentResults.findOne({ tournamentId });

    if (!results) {
      log("⚠️ No results found for tournament:", tournamentId);
      return res.status(404).json({
        success: false,
        message: "No results found for this tournament"
      });
    }

    log("✅ Tournament results found:", results._id);
    res.status(200).json({
      success: true,
      data: results
    });

  } catch (err) {
    errorLog("❌ Error fetching tournament results:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching results"
    });
  }
};

// ✅ Create or update tournament results
exports.saveTournamentResults = async (req, res) => {
  try {
    const { tournamentId, winners, matchResults, updatedBy, adminNotes } = req.body;
    log("📝 Saving tournament results for:", tournamentId);

    // Validate required fields
    if (!tournamentId || !updatedBy) {
      errorLog("❌ Missing required fields:", { tournamentId, updatedBy });
      return res.status(400).json({
        success: false,
        message: "Tournament ID and updatedBy are required"
      });
    }

    // Validate tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      errorLog("❌ Tournament not found:", tournamentId);
      return res.status(404).json({
        success: false,
        message: "Tournament not found"
      });
    }

    // Validate data arrays
    const winnersData = Array.isArray(winners) ? winners : [];
    const matchResultsData = Array.isArray(matchResults) ? matchResults : [];

    // Clean and validate winners data
    const cleanWinners = winnersData
      .filter(w => w.playerName && w.playerName.trim())
      .map((w, index) => ({
        playerName: w.playerName.trim(),
        kills: parseInt(w.kills) || 0,
        prize: parseFloat(w.prize) || 0,
        position: index + 1
      }));

    // Clean and validate match results data
    const cleanMatchResults = matchResultsData
      .filter(r => r.playerName && r.playerName.trim())
      .map((r, index) => ({
        playerName: r.playerName.trim(),
        kills: parseInt(r.kills) || 0,
        position: index + 1
      }));

    log("📊 Cleaned data:", {
      winners: cleanWinners.length,
      matchResults: cleanMatchResults.length
    });

    // Create or update tournament results
    const existingResults = await TournamentResults.findOne({ tournamentId });

    let results;
    if (existingResults) {
      // Update existing results
      existingResults.winners = cleanWinners;
      existingResults.matchResults = cleanMatchResults;
      existingResults.updatedBy = updatedBy;
      existingResults.adminNotes = adminNotes || '';

      results = await existingResults.save();
      log("✅ Updated existing tournament results:", results._id);
    } else {
      // Create new results
      results = new TournamentResults({
        tournamentId,
        winners: cleanWinners,
        matchResults: cleanMatchResults,
        updatedBy,
        adminNotes: adminNotes || ''
      });

      await results.save();
      log("✅ Created new tournament results:", results._id);
    }

    res.status(200).json({
      success: true,
      message: "Tournament results saved successfully",
      data: results
    });

  } catch (err) {
    errorLog("❌ Error saving tournament results:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while saving results"
    });
  }
};

// ✅ Update tournament results (same as save, but specifically for PUT requests)
exports.updateTournamentResults = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { winners, matchResults, updatedBy, adminNotes } = req.body;

    log("📝 Updating tournament results for:", tournamentId);

    // Find existing results
    const existingResults = await TournamentResults.findOne({ tournamentId });
    if (!existingResults) {
      errorLog("❌ Tournament results not found:", tournamentId);
      return res.status(404).json({
        success: false,
        message: "Tournament results not found"
      });
    }

    // Validate and clean data
    const cleanWinners = (Array.isArray(winners) ? winners : [])
      .filter(w => w.playerName && w.playerName.trim())
      .map((w, index) => ({
        playerName: w.playerName.trim(),
        kills: parseInt(w.kills) || 0,
        prize: parseFloat(w.prize) || 0,
        position: index + 1
      }));

    const cleanMatchResults = (Array.isArray(matchResults) ? matchResults : [])
      .filter(r => r.playerName && r.playerName.trim())
      .map((r, index) => ({
        playerName: r.playerName.trim(),
        kills: parseInt(r.kills) || 0,
        position: index + 1
      }));

    // Update the results
    existingResults.winners = cleanWinners;
    existingResults.matchResults = cleanMatchResults;
    existingResults.updatedBy = updatedBy;
    existingResults.adminNotes = adminNotes || existingResults.adminNotes;

    const updatedResults = await existingResults.save();
    log("✅ Tournament results updated:", updatedResults._id);

    res.status(200).json({
      success: true,
      message: "Tournament results updated successfully",
      data: updatedResults
    });

  } catch (err) {
    errorLog("❌ Error updating tournament results:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating results"
    });
  }
};

// ✅ Delete tournament results (admin only)
exports.deleteTournamentResults = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    log("📝 Deleting tournament results for:", tournamentId);

    const deletedResults = await TournamentResults.findOneAndDelete({ tournamentId });

    if (!deletedResults) {
      errorLog("❌ Tournament results not found for deletion:", tournamentId);
      return res.status(404).json({
        success: false,
        message: "Tournament results not found"
      });
    }

    log("✅ Tournament results deleted:", deletedResults._id);
    res.status(200).json({
      success: true,
      message: "Tournament results deleted successfully"
    });

  } catch (err) {
    errorLog("❌ Error deleting tournament results:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting results"
    });
  }
};

// ✅ Get all tournament results (admin dashboard)
exports.getAllTournamentResults = async (req, res) => {
  try {
    log("📝 Fetching all tournament results");

    const results = await TournamentResults.find()
      .populate('tournamentId', 'title gameType date timestamp prizePool')
      .sort({ updatedAt: -1 });

    log("✅ Found tournament results:", results.length);

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (err) {
    errorLog("❌ Error fetching all tournament results:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching all results"
    });
  }
};

// ✅ Get results by game type
exports.getTournamentResultsByType = async (req, res) => {
  try {
    const { gameType } = req.query;
    log("📝 Fetching tournament results by game type:", gameType);

    // Validate game type
    const validGameTypes = ['BR', 'CS', 'LONE WOLF', 'SPECIAL'];
    if (gameType && !validGameTypes.includes(gameType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid game type. Must be one of: ${validGameTypes.join(', ')}`
      });
    }

    let matchConditions = {};
    if (gameType) {
      // First find tournaments of the specified type
      const tournaments = await Tournament.find({ gameType }).select('_id');
      const tournamentIds = tournaments.map(t => t._id);
      matchConditions.tournamentId = { $in: tournamentIds };
    }

    const results = await TournamentResults.find(matchConditions)
      .populate('tournamentId', 'title gameType date timestamp prizePool')
      .sort({ updatedAt: -1 });

    log("✅ Found tournament results by type:", results.length);

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (err) {
    errorLog("❌ Error fetching tournament results by type:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching results by type"
    });
  }
};
