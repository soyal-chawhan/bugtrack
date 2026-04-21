# BugTrack

A lightweight bug and issue tracker for dev teams. Built with vanilla HTML/CSS/JS on the frontend and Node.js + Express + MongoDB on the backend.

**Live demo:** [your-app.vercel.app](https://your-app.vercel.app)

---

## Features

- Register with email + OTP verification, or sign in with Google
- Create projects and manage team members per project
- Create, edit, and delete tickets with priority, status, and assignee
- Drag-and-drop Kanban board (To Do → In Progress → Done)
- Filter and search tickets by project, priority, status, or keyword
- Comment on tickets
- Forgot password / reset via email link
- Six UI themes — Clean Light, Charcoal Dark, Forest Green, Desert Sand, Slate Blue, Rose Quartz
- Account settings and delete account

---

## Tech stack

**Frontend** — Vanilla HTML, CSS, JavaScript. No framework, no build step. Hosted on Vercel.

**Backend** — Node.js + Express. REST API with JWT auth. Hosted on Render.

**Database** — MongoDB Atlas (cloud).

**Email** — Nodemailer with Gmail App Password.

**Auth** — JWT + bcrypt for email auth. Google OAuth2 for social login.

---

## Project structure

```
bugtrack/
├── frontend/
│   ├── index.html          ← Auth page (login, register, OTP, forgot/reset password)
│   ├── app.html            ← Main dashboard (kanban, tickets, projects)
│   ├── css/
│   │   ├── auth.css        ← Styles for index.html
│   │   └── app.css         ← Styles for app.html (includes all 6 themes)
│   └── js/
│       ├── auth.js         ← Auth logic (login, register, OTP, Google, forgot/reset)
│       └── app.js          ← App logic (dashboard, kanban, tickets, projects)
│
└── backend/
    ├── server.js           ← Express entry point
    ├── .env                ← Your local environment variables (never commit this)
    ├── .env.example        ← Template for environment variables
    ├── middleware/
    │   └── auth.js         ← JWT verification middleware
    ├── models/
    │   ├── User.js
    │   ├── Ticket.js
    │   ├── Project.js
    │   └── Comment.js
    ├── routes/
    │   ├── auth.js         ← /api/auth/* endpoints
    │   ├── tickets.js      ← /api/tickets/* endpoints
    │   ├── projects.js     ← /api/projects/* endpoints
    │   └── comments.js     ← /api/comments/* endpoints
    └── utils/
        └── mailer.js       ← Sends OTP and password reset emails
```

---

## Running locally

### Prerequisites
- Node.js v18+
- MongoDB running locally or a MongoDB Atlas account
- Gmail account with App Password enabled

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your values in .env
npm run dev
```

Server starts at `http://localhost:5000`

### Frontend

Open `frontend/index.html` with VS Code Live Server.

Or serve it:
```bash
cd frontend
npx serve .
```

> The app works without the backend — it falls back to localStorage demo mode.

---

## API reference

All routes except `/api/auth/*` require `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register — sends OTP to email |
| POST | `/api/auth/verify-otp` | Verify OTP — activates account |
| POST | `/api/auth/resend-otp` | Resend OTP |
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/google` | Login / register with Google |
| POST | `/api/auth/forgot-password` | Send password reset link |
| POST | `/api/auth/reset-password` | Reset password with token |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List tickets (supports `?status=`, `?priority=`, `?projectId=`) |
| GET | `/api/tickets/:id` | Get single ticket |
| POST | `/api/tickets` | Create ticket |
| PATCH | `/api/tickets/:id` | Update ticket |
| DELETE | `/api/tickets/:id` | Delete ticket |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comments/:ticketId` | Get all comments on a ticket |
| POST | `/api/comments` | Post a comment |
| DELETE | `/api/comments/:id` | Delete your comment |

---

## Deployment

### Backend → Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo → select the `backend` folder as root
4. Set **Build Command:** `npm install`
5. Set **Start Command:** `node server.js`
6. Add all environment variables from `.env.example`
7. Deploy — you get a URL like `https://bugtrack-api.onrender.com`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Connect your GitHub repo → select the `frontend` folder as root
3. No build command needed (static site)
4. Deploy — you get a URL like `https://bugtrack.vercel.app`
5. Update `const API` in `frontend/js/auth.js` and `frontend/js/app.js` to your Render URL
6. Update `FRONTEND_URL` in Render environment variables to your Vercel URL

---

## Environment variables reference

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `GOOGLE_CLIENT_ID` | Google OAuth2 Client ID |
| `MAIL_USER` | Gmail address for sending emails |
| `MAIL_PASS` | Gmail App Password (16 chars, no spaces) |
| `MAIL_FROM` | Display name + email for outgoing mail |
| `FRONTEND_URL` | Your frontend URL (for CORS + reset links) |

---

## License

MIT
