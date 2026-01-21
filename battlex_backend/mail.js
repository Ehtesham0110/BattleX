const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  requireTLS: true,
  auth: {
    user: "apikey",
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP error:", error);
  } else {
    console.log("✅ SMTP ready");
  }
});

async function sendMail({ to, subject, text, html }) {
  await transporter.sendMail({
    from: `"BattleX" <${process.env.SMTP_FROM}>`,
    to,
    subject,
    text,
    html,
  });
}


module.exports = sendMail;
