const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const multer = require('multer');
const tournamentController = require('../controllers/tournamentController');
const tournamentResultsController = require('../controllers/tournamentResultsController'); // ✅ NEW: Import results controller

// Multer setup (in-memory storage, since we forward to controller)
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* ----------------- Utility: Validation Error Handler ----------------- */
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("❌ Validation failed:", errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

/* ----------------- Utility: Async Wrapper with Logging ----------------- */
const asyncHandler = (fn, routeName) => async (req, res, next) => {
  console.log(`📌 [Route Called] ${routeName}`, {
    params: req.params,
    query: req.query,
    body: req.body,
  });

  try {
    await fn(req, res, next);
    console.log(`✅ [Route Success] ${routeName}`);
  } catch (err) {
    console.error(`❌ [Route Error] ${routeName}`, err.message, err.stack);
    res.status(500).json({
      success: false,
      message: `Internal server error at ${routeName}`,
      error: err.message,
    });
  }
};

/* ----------------- Tournament List ----------------- */
router.get(
  '/all',
  asyncHandler(tournamentController.getAllTournaments, 'getAllTournaments')
);

router.get(
  '/',
  asyncHandler(tournamentController.getTournamentsByType, 'getTournamentsByType')
);

/* ----------------- Tournament Creation ----------------- */
router.post(
  '/create',
  upload.single('image'),
  validate([
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('gameType')
      .isIn(['BR', 'CS', 'LONE WOLF', 'SPECIAL']) // ✅ Updated to include all game types
      .withMessage('Game type must be BR, CS, LONE WOLF, or SPECIAL'),
    body('timestamp')
      .isISO8601()
      .withMessage('Timestamp must be a valid ISO8601 date'),
    body('entryFee').isNumeric().withMessage('Entry fee must be a number'),
    body('maxPlayers')
      .isInt({ min: 2 })
      .withMessage('Max players must be at least 2'),
    body('prizePool').isNumeric().withMessage('Prize pool must be a number'),
    body('prizePerKill') // ✅ Updated field name validation
      .optional()
      .isNumeric()
      .withMessage('Prize per kill must be a number')
      .custom((value) => {
        if (value && Number(value) < 0) {
          throw new Error('Prize per kill must be a positive number');
        }
        return true;
      }),
  ]),
  asyncHandler(async (req, res, next) => {
    if (!req.file) {
      console.error("❌ No image file uploaded for tournament creation");
      return res.status(400).json({ error: "Tournament image is required" });
    }

    // Extra validations for image type and size
    if (!req.file.mimetype.startsWith('image/')) {
      console.error("❌ Uploaded file is not an image:", req.file.mimetype);
      return res.status(400).json({ error: "Uploaded file must be an image" });
    }
    if (req.file.size > 5 * 1024 * 1024) {
      console.error("❌ Image size too large:", req.file.size);
      return res.status(400).json({ error: "Image size must be < 5MB" });
    }

    await tournamentController.createTournament(req, res, next);
  }, 'createTournament')
);

/* ----------------- Tournament Results - NEW ENDPOINTS ✅ ----------------- */

// Get tournament results by tournament ID
router.get(
  '/tournament-results/:tournamentId',
  validate([
    param('tournamentId').isMongoId().withMessage('Invalid tournament ID')
  ]),
  asyncHandler(tournamentResultsController.getTournamentResults, 'getTournamentResults')
);

// Create or update tournament results
router.post(
  '/tournament-results',
  validate([
    body('tournamentId').isMongoId().withMessage('Tournament ID is required'),
    body('updatedBy').notEmpty().withMessage('Updated by is required'),
    body('winners').optional().isArray().withMessage('Winners must be an array'),
    body('matchResults').optional().isArray().withMessage('Match results must be an array')
  ]),
  asyncHandler(tournamentResultsController.saveTournamentResults, 'saveTournamentResults')
);

// Update tournament results (PUT method)
router.put(
  '/tournament-results/:tournamentId',
  validate([
    param('tournamentId').isMongoId().withMessage('Invalid tournament ID'),
    body('updatedBy').notEmpty().withMessage('Updated by is required'),
    body('winners').optional().isArray().withMessage('Winners must be an array'),
    body('matchResults').optional().isArray().withMessage('Match results must be an array')
  ]),
  asyncHandler(tournamentResultsController.updateTournamentResults, 'updateTournamentResults')
);

// Delete tournament results (admin only)
router.delete(
  '/tournament-results/:tournamentId',
  validate([
    param('tournamentId').isMongoId().withMessage('Invalid tournament ID')
  ]),
  asyncHandler(tournamentResultsController.deleteTournamentResults, 'deleteTournamentResults')
);

// Get all tournament results (admin dashboard)
router.get(
  '/tournament-results',
  asyncHandler(tournamentResultsController.getAllTournamentResults, 'getAllTournamentResults')
);

// Get tournament results by game type
router.get(
  '/tournament-results-by-type',
  asyncHandler(tournamentResultsController.getTournamentResultsByType, 'getTournamentResultsByType')
);

/* ----------------- Original Match Results (keeping for compatibility) ----------------- */
router.post(
  '/submit-result',
  validate([
    body('tournamentId').notEmpty().withMessage('Tournament ID is required'),
    body('userId').notEmpty().withMessage('User ID is required'),
  ]),
  asyncHandler(tournamentController.submitResult, 'submitResult')
);

router.post(
  '/verify-result/:resultId',
  validate([param('resultId').isMongoId().withMessage('Invalid result ID')]),
  asyncHandler(tournamentController.verifyResult, 'verifyResult')
);

router.get(
  '/results/all',
  asyncHandler(tournamentController.getAllResults, 'getAllResults')
);

router.get(
  '/results/user/:userId',
  validate([param('userId').isMongoId().withMessage('Invalid user ID')]),
  asyncHandler(tournamentController.getUserHistory, 'getUserHistory')
);

/* ----------------- Tournament Join & Players ----------------- */
router.post(
  '/join/:id',
  validate([
    param('id').isMongoId().withMessage('Invalid tournament ID'),
    body('username').notEmpty().withMessage('Username is required'),
    body('phoneNumber')
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
  ]),
  asyncHandler(async (req, res, next) => {
    console.log("📝 User joining with username:", req.body.username);
    await tournamentController.joinTournament(req, res, next);
  }, 'joinTournament')
);

router.get(
  '/:id/players',
  validate([param('id').isMongoId().withMessage('Invalid tournament ID')]),
  asyncHandler(tournamentController.getJoinedPlayers, 'getJoinedPlayers')
);

/* ----------------- Tournament Details ----------------- */
router.get(
  '/:id/details',
  validate([param('id').isMongoId().withMessage('Invalid tournament ID')]),
  asyncHandler(async (req, res, next) => {
    // `phoneNumber` is optional
    req.query.phoneNumber = req.query.phoneNumber || null;
    await tournamentController.getTournamentDetails(req, res, next);
  }, 'getTournamentDetails')
);

/* ----------- Tournament Joined History --------------- */
router.get(
  '/my-tournaments/:userId',
  validate([param('userId').isMongoId().withMessage('Invalid user ID')]),
  asyncHandler(tournamentController.getMyTournaments, 'getMyTournaments')
);

module.exports = router;
