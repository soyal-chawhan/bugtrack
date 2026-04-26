require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const helmet   = require('helmet');
const cors     = require('cors');

const authRoutes    = require('./routes/auth');
const ticketRoutes  = require('./routes/tickets');
const projectRoutes = require('./routes/projects');
const commentRoutes = require('./routes/comments');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE────────────────────────────────

app.use(helmet());

const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'https://bugtrack.vercel.app',
  'https://bugtrack-soyalchawhans-projects.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed — ' + origin));
  },
  methods:        ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// ── ROUTES──────────────────────────────────

app.get('/', (req, res) => {
  res.json({ message: 'BugTrack API running', version: '2.0.0' });
});

app.use('/api/auth',     authRoutes);
app.use('/api/tickets',  ticketRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/comments', commentRoutes);

// ── ERROR HANDLERS ────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong.' });
});

// ── DATABASE + START ────────────────────

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  });
