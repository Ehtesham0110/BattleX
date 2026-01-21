const axios = require("axios");

const BREVO_API_KEY = process.env.SMTP_PASS; // xkeysib-...

async function sendMail({ to, subject, html, text }) {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "BattleX",
          email: process.env.SMTP_FROM,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
  } catch (err) {
    console.error(
      "❌ Brevo API email error:",
      err.response?.data || err.message
    );
    throw err;
  }
}

module.exports = sendMail;
