const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(toEmail, otp) {
  const html = `
    <div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:32px 24px;border:1px solid #e2e1db;border-radius:12px">
      <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a">Verify your email</h2>
      <p style="color:#5a5a5a;margin:0 0 24px;font-size:15px">
        Use the code below to complete your BugTrack registration.
        It expires in <strong>10 minutes</strong>.
      </p>
      <div style="background:#f4f3ef;border-radius:8px;padding:20px;text-align:center;letter-spacing:10px;font-size:32px;font-weight:700;color:#1a1a1a">
        ${otp}
      </div>
      <p style="color:#9a9a9a;font-size:13px;margin:20px 0 0">
        If you didn't request this, ignore this email.
      </p>
    </div>
  `;
  await transporter.sendMail({
    from:    process.env.MAIL_FROM || 'BugTrack <noreply@bugtrack.app>',
    to:      toEmail,
    subject: 'Your BugTrack verification code',
    html,
  });
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  const html = `
    <div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:32px 24px;border:1px solid #e2e1db;border-radius:12px">
      <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a">Reset your password</h2>
      <p style="color:#5a5a5a;margin:0 0 24px;font-size:15px">
        Click the button below to set a new password.
        This link expires in <strong>30 minutes</strong>.
      </p>
      <a href="${resetLink}"
        style="display:inline-block;background:#c17d3a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
        Reset Password
      </a>
      <p style="color:#9a9a9a;font-size:13px;margin:20px 0 0">
        If you didn't request this, ignore this email.
      </p>
    </div>
  `;
  await transporter.sendMail({
    from:    process.env.MAIL_FROM || 'BugTrack <noreply@bugtrack.app>',
    to:      toEmail,
    subject: 'Reset your BugTrack password',
    html,
  });
}

module.exports = { generateOTP, sendOTPEmail, sendPasswordResetEmail };
