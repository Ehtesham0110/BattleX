// const axios = require("axios");

// async function sendMail({ to, subject, html, text }) {
//   try {
//     const response = await axios.post(
//       "https://api.brevo.com/v3/smtp/email",
//       {
//         sender: {
//           name: "BattleX",
//           email: "battlexffofficial@gmail.com",
//         },
//         to: [{ email: to }],
//         subject,
//         htmlContent: html,
//         textContent: text,
//       },
//       {
//         headers: {
//           "api-key": process.env.SMTP_PASS,
//           "accept": "application/json",
//           "Content-Type": "application/json",
//         },
//         timeout: 10000,
//       }
//     );
//     console.log("✅ Brevo email SENT to:", to);
//     return response.data;
//   } catch (err) {
//     // ✅ CRITICAL: NEVER THROW - Non-blocking!
//     console.error("⚠️ Brevo FAILED (OK):", 
//       err.response?.status, 
//       err.response?.data?.message || err.message
//     );
//     // Email fails = signup still works ✅
//   }
// }

// module.exports = sendMail;
