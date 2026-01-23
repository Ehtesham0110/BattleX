{% comment %} module.exports = function otpEmailTemplate({ otp, minutes = 10 }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>BattleX OTP</title>
</head>
<body style="margin:0;padding:20px;background:#0a0e17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:500px;margin:0 auto;background:#111827;padding:40px;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);">
    
    <div style="text-align:center;margin-bottom:30px;">
      <div style="width:70px;height:70px;margin:0 auto 20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;color:white;box-shadow:0 10px 25px rgba(59,130,246,.3);">BX</div>
      <h1 style="color:#3b82f6;font-size:28px;font-weight:700;margin:0 0 10px;letter-spacing:.5px;">Verify BattleX Account</h1>
    </div>

    <div style="text-align:center;">
      <div style="
        font-size:44px;
        font-weight:900;
        letter-spacing:12px;
        color:#3b82f6;
        background:linear-gradient(145deg,#111827,#1f2937);
        border:3px solid #3b82f6;
        border-radius:16px;
        padding:25px 20px;
        margin:30px 0;
        text-shadow:0 0 20px rgba(59,130,246,.4);
        box-shadow:0 0 40px rgba(59,130,246,.2);
      ">
        ${otp}
      </div>
      
      <p style="color:#9ca3af;font-size:16px;line-height:1.6;margin:0 0 30px;">
        This code expires in <strong style="color:#3b82f6;">${minutes} minutes</strong>.
      </p>
    </div>

    <hr style="border:none;height:1px;background:#374151;margin:30px 0;opacity:.3;">

    <p style="color:#6b7280;font-size:14px;text-align:center;margin:0;line-height:1.5;">
      Didn't request this? <strong style="color:#9ca3af;">No problem</strong> - just ignore.
    </p>

    <div style="text-align:center;margin-top:25px;padding-top:20px;border-top:1px solid #374151;">
      <p style="color:#4b5563;font-size:12px;margin:0;">© 2026 BattleX Esports</p>
    </div>
  </div>
</body>
</html>`;
}; {% endcomment %}
