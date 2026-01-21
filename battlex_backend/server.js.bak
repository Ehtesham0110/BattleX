require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// 🔍 DEBUG: Wrap express.Router to log all routes being registered
const originalRouter = express.Router;
express.Router = function (...args) {
  const router = originalRouter.apply(this, args);

  const wrap = (method) => {
    const orig = router[method];
    router[method] = function (path, ...handlers) {
      console.log(`Registering ${method.toUpperCase()} route:`, path);
      return orig.call(this, path, ...handlers);
    };
  };

  ['get', 'post', 'put', 'delete', 'patch', 'options', 'all'].forEach(wrap);

  return router;
};

// ✅ Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Connect MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ✅ Routes
const authRoutes = require('./routes/auth');
const tournamentRoutes = require('./routes/tournaments');
const resultRoutes = require('./routes/resultRoutes');
const walletRoutes = require('./routes/walletRoutes');

console.log("Mounting /api/auth");
app.use('/api/auth', authRoutes);

console.log("Mounting /api/tournaments");
app.use('/api/tournaments', tournamentRoutes);

console.log("Mounting /api/results");
app.use('/api/results', resultRoutes);

console.log("Mounting /api/wallet");
app.use('/api/wallet', walletRoutes);

// ✅ Result Upload Endpoint
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const isValid = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
    cb(isValid ? null : new Error('Only images allowed'), isValid);
  }
});

const Result = require('./models/result');
app.post('/api/results/upload', upload.single('screenshot'), async (req, res) => {
  try {
    const { userId, tournamentId, kills, rank, prize } = req.body;

    if (!userId || !tournamentId || kills === undefined || rank === undefined || prize === undefined) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const exists = await Result.findOne({ userId, tournamentId });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Already submitted' });
    }

    const result = new Result({
      userId,
      tournamentId,
      kills,
      rank,
      prize,
      screenshotUrl: req.file ? `/uploads/${req.file.filename}` : null
    });

    await result.save();
    res.status(201).json({ success: true, result });
  } catch (err) {
    console.error('❌ Result upload error:', err.message);
    res.status(500).json({ success: false, message: 'Upload error' });
  }
});

// 🧪 Test DB
app.get('/test-db', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    res.json({ collections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ Delete old tournaments
const Tournament = require('./models/tournament');
app.delete('/api/tournament/delete-old', async (req, res) => {
  try {
    const all = await Tournament.find({});
    const invalid = all.filter(t => typeof t.date === 'string');

    const idsToDelete = invalid.map(t => t._id);
    await Tournament.deleteMany({ _id: { $in: idsToDelete } });

    res.json({
      deletedCount: idsToDelete.length,
      message: "Old tournaments with invalid date removed"
    });
  } catch (err) {
    console.error("❌ Error deleting old tournaments:", err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

// 🧯 Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

// 🚀 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server ready: http://localhost:${PORT}`));
