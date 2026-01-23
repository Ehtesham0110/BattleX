require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
const multer = require('multer');
const { pathToRegexp } = require('path-to-regexp');
const cloudinary = require('cloudinary').v2;
const notificationsRoutes = require('./routes/notifications');

// ✅ Firebase Admin centralized import (single instance)
const admin = require("./firebaseAdmin");

const app = express();

// -------------------
// Cloudinary setup
// -------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// -------------------
// Logs setup with rotation
// -------------------
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);
const MAX_LOG_SIZE = 5 * 1024 * 1024;

function getLogFileName() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `log_${date}.txt`);
}

function logToFile(message) {
  const filePath = getLogFileName();
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${message}\n`;
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size + logMsg.length > MAX_LOG_SIZE) {
      const rotatedName = filePath.replace('.txt', `_${Date.now()}.txt`);
      fs.renameSync(filePath, rotatedName);
      console.log(`🌀 Rotated log file: ${rotatedName}`);
    }
    fs.appendFileSync(filePath, logMsg);
  } catch (err) {
    console.error('⚠ Failed to write log:', err);
  }
}

// -------------------
// Middleware
// -------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/notifications', notificationsRoutes);

// -------------------
// MongoDB connection  
// -------------------
const { scheduleTournamentReminders } = require('./controllers/notificationsController');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
  console.log('✔ MongoDB connected');
  logToFile('✔ MongoDB connected');
  
  // ✅ START NOTIFICATION SCHEDULER AFTER DB CONNECTION
  scheduleTournamentReminders();
  
}).catch(err => {
  console.error('❌ MongoDB error:', err);
  logToFile('❌ MongoDB error: ' + err.message);
});


// -------------------
// Request logger
// -------------------
app.use((req, res, next) => {
  const logMsg = `📡 [${req.method}] ${req.originalUrl} Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)} Body: ${JSON.stringify(req.body)}`;
  console.log(logMsg);
  logToFile(logMsg);
  next();
});

// -------------------
// Multer setup
// -------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExt = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExt.test(ext)) {
      return cb(new Error('Upload file must be an image'), false);
    }

    cb(null, true);
  }
});

// -------------------
// Async handler wrapper
// -------------------
function asyncHandler(fn, routeName) {
  return async (req, res, next) => {
    logToFile(`📌 [Route Called] ${routeName}`);
    try {
      await fn(req, res, next);
      logToFile(`✅ [Route Success] ${routeName}`);
    } catch (err) {
      logToFile(`❌ [Route Error] ${routeName}: ${err.message}`);
      console.error(`❌ [Route Error] ${routeName}:`, err);

      // Delete local file if exists
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) logToFile(`⚠ Failed to delete file: ${req.file.path} ${unlinkErr.message}`);
          else logToFile(`🗑 Deleted uploaded file due to error: ${req.file.path}`);
        });
      }

      res.status(500).json({ success: false, message: `Internal server error at ${routeName}` });
    }
  };
}

// -------------------
// Route scanner
// -------------------
function scanRoutes(dir) {
  const errors = [];
  function checkFile(filePath) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
      const match = line.match(/\brouter\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]*)['"`]/);
      if (match) {
        const routePath = match[2];
        if (/\/:(?=\/|$|\?)/.test(routePath)) {
          errors.push({ file: filePath, line: idx + 1, pattern: routePath, type: 'Empty param', suggestion: 'Replace empty param with a valid name, e.g., /:id' });
        }
        try { pathToRegexp(routePath); } 
        catch (err) { errors.push({ file: filePath, line: idx + 1, pattern: routePath, type: 'Invalid pattern', message: err.message, suggestion: 'Check route syntax' }); }
      }
    });
  }
  function walk(dirPath) { 
    fs.readdirSync(dirPath).forEach(file => { 
      const fullPath = path.join(dirPath, file); 
      if (fs.statSync(fullPath).isDirectory()) walk(fullPath); 
      else if (file.endsWith('.js')) checkFile(fullPath); 
    }); 
  }
  walk(dir);
  if (errors.length) {
    console.error('\n❌ Found invalid routes:');
    logToFile('❌ Found invalid routes');
    errors.forEach(e => {
      const msg = `File: ${e.file} Line: ${e.line} Pattern: "${e.pattern}" Type: ${e.type} ${e.message || ''} Suggestion: ${e.suggestion}`;
      console.error(msg);
      logToFile(msg);
    });
    console.error('\n❌ Fix all route errors before starting the server.');
    process.exit(1);
  } else {
    console.log('✔ All route patterns are valid.');
    logToFile('✔ All route patterns are valid.');
  }
}

// Scan routes folder
scanRoutes(path.join(__dirname, 'routes'));

// -------------------
// Load routes
// -------------------
const routeFiles = [
  { path: '/api/auth', file: './routes/auth' },
  { path: '/api/tournaments', file: './routes/tournaments' },
  { path: '/api/leaderboard', file: './routes/leaderboard' },
  { path: '/api/results', file: './routes/resultRoutes' },
  { path: '/api/wallet', file: './routes/walletRoutes' },
];

routeFiles.forEach(({ path: mountPath, file }) => {
  const router = require(file);
  if (!router || typeof router !== 'function') return;

  router.stack?.forEach(layer => {
    if (layer.route) {
      Object.keys(layer.route.methods).forEach(method => {
        const original = layer.route.stack[0].handle;
        layer.route.stack[0].handle = asyncHandler(async (req, res, next) => {
          try {
            await original(req, res, next);
          } catch (err) {
            // Cloudinary fallback for uploads
            if (req.file && req.file.path) {
              const localPath = req.file.path;
              try {
                const result = await cloudinary.uploader.upload(localPath);
                req.file.cloudinaryUrl = result.secure_url;
                logToFile(`☁️ Uploaded ${localPath} to Cloudinary: ${result.secure_url}`);
                fs.unlinkSync(localPath);
              } catch (cloudErr) {
                logToFile(`⚠ Cloudinary upload failed for ${localPath}: ${cloudErr.message}`);
              }
            }
            throw err;
          }
        }, `${method.toUpperCase()} ${mountPath}${layer.route.path}`);
      });
    }
  });

  app.use(mountPath, router);
  console.log(`✔ Mounted ${mountPath}`);
  logToFile(`✔ Mounted ${mountPath}`);
});

// -------------------
// Health check
// -------------------
app.get("/api/ping", (req, res) => res.send("Backend is awake!"));

// -------------------
// Cleanup old uploads
// -------------------
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MAX_AGE_DAYS = 7;
setInterval(() => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return console.error('⚠ Failed to read upload folder', err);
    files.forEach(file => {
      const filePath = path.join(UPLOAD_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return console.error('⚠ Failed to stat file', filePath, err);
        const ageDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (ageDays > MAX_AGE_DAYS) {
          fs.unlink(filePath, err => {
            if (!err) logToFile(`🗑 Deleted old file: ${filePath}`);
          });
        }
      });
    });
  });
}, 1000 * 60 * 60);

// -------------------
// Global error handler
// -------------------
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  logToFile('❌ Server error: ' + err.message);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

// -------------------
// Start server
// -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  logToFile(`🚀 Server running at http://localhost:${PORT}`);
});
