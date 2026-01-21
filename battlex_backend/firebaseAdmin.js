const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Agar storage bucket use karna ho toh ye bhi add kar sakte ho:
    // storageBucket: "battlex-cc710.appspot.com"
  });
  console.log("✔ Firebase Admin Initialized");
} else {
  console.log("✔ Firebase Admin already initialized");
}

module.exports = admin;
