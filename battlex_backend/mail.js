// const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp-relay.brevo.com",
//   port: 465,              // ✅ CHANGE
//   secure: true,           // ✅ REQUIRED for 465
//   auth: {
//     user: "apikey",
//     pass: process.env.SMTP_PASS,
//   },
//   connectionTimeout: 10000, // ✅ prevent hanging
//   greetingTimeout: 10000,
// });

// transporter.verify((error) => {
//   if (error) {
//     console.error("❌ SMTP error:", error);
//   } else {
//     console.log("✅ SMTP ready");
//   }
// });

// async function sendMail({ to, subject, text, html }) {
//   await transporter.sendMail({
//     from: `"BattleX" <${process.env.SMTP_FROM}>`,
//     to,
//     subject,
//     text,
//     html,
//   });
// }

// module.exports = sendMail;
