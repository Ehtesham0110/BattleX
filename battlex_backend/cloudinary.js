// battlex_backend/cloudinary.js

// cloudinary.js
const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_URL) {
  // if you set CLOUDINARY_URL (recommended) Cloudinary lib will parse it
  cloudinary.config({ secure: true });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

module.exports = cloudinary;

