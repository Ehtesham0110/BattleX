const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,          // smtp-relay.brevo.com
  port: Number(process.env.SMTP_PORT),  // 587
  secure: false,
  requireTLS: true,                     // 🔴 REQUIRED
  auth: {
    user: "apikey",                     // 🔴 MUST be literal "apikey"
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false           // 🔴 REQUIRED on Render
  }
});

async function sendMail({ to, subject, text }) {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject,
    text
  });
}

module.exports = sendMail;
