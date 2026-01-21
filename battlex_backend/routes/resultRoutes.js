const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
  submitResult,
  uploadResult,
  getUserHistory,
  getPendingResults,
  verifyResultRoute,
  getAllResults
} = require('../controllers/resultsController');

// -------------------
// Multer setup (memory storage for Cloudinary)
// -------------------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      file.originalname.toLowerCase().split('.').pop()
    );
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only JPEG and PNG images are allowed!'));
  }
});

// -------------------
// Async handler wrapper
// -------------------
function asyncHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      console.error('❌ Route error:', err);
      res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
  };
}

// -------------------
// Routes
// -------------------
router.post('/submit', upload.single('screenshot'), asyncHandler(submitResult));
router.post('/upload', upload.single('screenshot'), asyncHandler(uploadResult));
router.get('/user/:userId', asyncHandler(getUserHistory));
router.get('/pending', asyncHandler(getPendingResults));

// ✅ PUT route for verifying results (approve/reject)
router.put('/verify/:resultId', asyncHandler(verifyResultRoute));

router.get('/all', asyncHandler(getAllResults));

module.exports = router;
