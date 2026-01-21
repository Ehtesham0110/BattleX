// battlex_backend/mail.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,      // smtp-relay.brevo.com
  port: Number(process.env.SMTP_PORT), // 587
  secure: false, // MUST be false for port 587
  auth: {
    user: process.env.SMTP_USER, // MUST be "apikey"
    pass: process.env.SMTP_PASS  // Brevo SMTP key
  }
});

async function sendMail({ to, subject, text }) {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL, // IMPORTANT
    to,
    subject,
    text
  });
}

module.exports = sendMail;
