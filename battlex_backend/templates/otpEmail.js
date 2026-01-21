module.exports = function otpEmailTemplate({ otp, minutes = 10 }) {
  return `
  <div style="font-family: Arial, sans-serif; background:#0f172a; padding:30px">
    <div style="max-width:420px; margin:auto; background:#020617; color:#fff; border-radius:10px; padding:25px">

      <h2 style="text-align:center; color:#38bdf8;">
        BattleX Verification
      </h2>

      <p style="font-size:14px; color:#cbd5f5;">
        Use the OTP below to verify your BattleX account.
      </p>

      <div style="
        text-align:center;
        font-size:28px;
        letter-spacing:6px;
        font-weight:bold;
        margin:20px 0;
        padding:12px;
        background:#020617;
        border:1px dashed #38bdf8;
        border-radius:8px;
        color:#38bdf8;">
        ${otp}
      </div>

      <p style="font-size:13px; color:#94a3b8;">
        This OTP will expire in <b>${minutes} minutes</b>.
      </p>

      <hr style="border:none; border-top:1px solid #1e293b; margin:20px 0"/>

      <p style="font-size:11px; color:#64748b; text-align:center;">
        If you did not request this, you can safely ignore this email.
      </p>

    </div>
  </div>
  `;
};
