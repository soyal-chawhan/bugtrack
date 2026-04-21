const express  = require('express');
const crypto   = require('crypto');
const jwt      = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const User   = require('../models/User');
const { generateOTP, sendOTPEmail, sendPasswordResetEmail } = require('../utils/mailer');

const router       = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email });
    if (existing && existing.isVerified) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const otp       = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (existing && !existing.isVerified) {
      existing.name     = name;
      existing.password = password;
      existing.otp      = { code: otp, expiresAt };
      await existing.save();
    } else {
      await User.create({ name, email, password, isVerified: false, otp: { code: otp, expiresAt } });
    }

    await sendOTPEmail(email, otp);
    res.json({ message: 'OTP sent to your email.', email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    const user = await User.findOne({ email });
    if (!user)           return res.status(404).json({ error: 'No account found for this email.' });
    if (user.isVerified) return res.status(400).json({ error: 'Account is already verified.' });
    if (!user.otp.code)  return res.status(400).json({ error: 'No OTP found. Please register again.' });
    if (new Date() > user.otp.expiresAt) return res.status(400).json({ error: 'OTP has expired. Please register again.' });
    if (user.otp.code !== otp.trim())    return res.status(400).json({ error: 'Incorrect OTP. Please check and try again.' });

    user.isVerified = true;
    user.otp        = { code: null, expiresAt: null };
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────

router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email });
    if (!user)           return res.status(404).json({ error: 'No account found.' });
    if (user.isVerified) return res.status(400).json({ error: 'Account is already verified.' });

    const otp = generateOTP();
    user.otp  = { code: otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    await user.save();
    await sendOTPEmail(email, otp);

    res.json({ message: 'New OTP sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Email not verified.', needsVerify: true, email: user.email });
    }
    if (!user.password) {
      return res.status(400).json({ error: 'This account uses Google Sign-In. Please sign in with Google.' });
    }

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────

router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Google ID token is required.' });

    const ticket  = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified } = payload;

    if (!email_verified) return res.status(400).json({ error: 'Google account email is not verified.' });

    let user = await User.findOne({ email });
    if (user) {
      if (!user.googleId) { user.googleId = googleId; user.isVerified = true; await user.save(); }
    } else {
      user = await User.create({ name, email, googleId, isVerified: true, password: null });
    }

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email });
    if (!user || !user.isVerified || !user.password) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    const token     = crypto.randomBytes(32).toString('hex');
    user.resetToken   = token;
    user.resetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL || 'http://127.0.0.1:5500'}/index.html?reset=${token}`;
    await sendPasswordResetEmail(email, resetLink);

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send reset email.' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const user = await User.findOne({ resetToken: token, resetExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

    user.password     = password;
    user.resetToken   = null;
    user.resetExpires = null;
    await user.save();

    res.json({ message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// ── POST /api/auth/google-token ───────────────────────────────────────────────
// Receives user info from Google OAuth2 access token flow

router.post('/google-token', async (req, res) => {
  try {
    const { email, name, googleId, verified } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ error: 'Invalid Google account data.' });
    }
    if (!verified) {
      return res.status(400).json({ error: 'Google account email is not verified.' });
    }

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId   = googleId;
        user.isVerified = true;
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        isVerified: true,
        password:   null,
      });
    }

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    console.error('Google token auth error:', err);
    res.status(500).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

module.exports = router;
