const axios = require("axios");

async function sendMail({ to, subject, html, text }) {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "BattleX",
          email: "battlexffofficial@gmail.com", // ✅ FIXED
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      },
      {
        headers: {
          "api-key": process.env.SMTP_PASS,
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
