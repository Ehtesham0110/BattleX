const admin = require("firebase-admin");

if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.warn("⚠ Firebase service account not found. Firebase disabled.");
  } else {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // storageBucket: "battlex-cc710.appspot.com"
    });

    console.log("✔ Firebase Admin Initialized");
  }
}

module.exports = admin;
