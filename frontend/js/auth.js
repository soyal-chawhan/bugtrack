/*
  auth.js — BugTrack auth logic
  Functions called from index.html buttons must be on window or Auth object.
  HTML uses: Auth.show(), Auth.togglePw(), Auth.googleSignIn(), Auth.resendOtp()
*/

const API = 'https://bugtrack-api-yst6.onrender.com';

// ── Theme ─────────────────────────────────────────────────────────────────────

function selectTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('bt_theme', theme);
  document.getElementById('themeOverlay').classList.add('hidden');
  document.getElementById('authShell').classList.remove('hidden');
}

function loadTheme() {
  const saved = localStorage.getItem('bt_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    document.getElementById('themeOverlay').classList.add('hidden');
    document.getElementById('authShell').classList.remove('hidden');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

function showSuccess(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function setLoading(btnId, isLoading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('loading', isLoading);
  btn.disabled = isLoading;
}

async function post(path, body) {
  const res = await fetch(API + path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res.json();
}

function saveSession(token, user) {
  localStorage.setItem('bt_token', token);
  localStorage.setItem('bt_user',  JSON.stringify(user));
}

// ── Auth object — all methods the HTML calls ───────────────────────────────────

const Auth = {

  pendingEmail: '',
  otpTimer:     null,

  // called by all "Back" and tab-switch buttons in HTML
  show(screenName) {
    document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('screen-' + screenName);
    if (target) target.classList.add('active');
  },

  // eye icon on password inputs
  togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type     = isHidden ? 'text' : 'password';
    btn.style.opacity = isHidden ? '1' : '0.45';
  },

  // Google Sign-In popup
googleSignIn() {
    if (typeof google === 'undefined') {
      alert('Google Sign-In is not ready yet. Please wait a second and try again.');
      return;
    }

    // ── your client ID ─────────────────────────────────────
    const CLIENT_ID = '759141366298-5u2hf2h42lh9enc2t2msv160b9prjn35.apps.googleusercontent.com';
    // ───────────────────────────────────────────────────────

    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     'openid email profile',
      callback:  async (tokenResponse) => {
        if (tokenResponse.error) {
          showError('loginError', 'Google sign-in was cancelled or failed.');
          return;
        }
        try {
          // get user info from Google using the access token
          const infoRes  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: 'Bearer ' + tokenResponse.access_token },
          });
          const userInfo = await infoRes.json();

          // send to our backend
          const data = await post('/auth/google-token', {
            email:    userInfo.email,
            name:     userInfo.name,
            googleId: userInfo.sub,
            verified: userInfo.email_verified,
          });

          if (data.error) { showError('loginError', data.error); return; }

          saveSession(data.token, data.user);
          window.location.href = 'app.html';
        } catch {
          showError('loginError', 'Google sign-in failed. Please try again.');
        }
      },
    });

    client.requestAccessToken({ prompt: 'select_account' });
  },

  // resend OTP button
  async resendOtp() {
    try {
      const data = await post('/auth/resend-otp', { email: Auth.pendingEmail });
      if (!data.error) {
        document.getElementById('resendBtn').classList.add('hidden');
        Auth.startCountdown();
      }
    } catch { /* silently ignore */ }
  },

  // 60s countdown before "Resend" button appears
  startCountdown() {
    clearInterval(Auth.otpTimer);
    let secs = 60;
    const countEl  = document.getElementById('countdown');
    const timerEl  = document.getElementById('resendTimer');
    const resendEl = document.getElementById('resendBtn');

    if (countEl)  countEl.textContent = secs;
    if (timerEl)  timerEl.classList.remove('hidden');
    if (resendEl) resendEl.classList.add('hidden');

    Auth.otpTimer = setInterval(() => {
      secs--;
      if (countEl) countEl.textContent = secs;
      if (secs <= 0) {
        clearInterval(Auth.otpTimer);
        if (timerEl)  timerEl.classList.add('hidden');
        if (resendEl) resendEl.classList.remove('hidden');
      }
    }, 1000);
  },
};

// ── OTP box keyboard navigation ───────────────────────────────────────────────

function setupOtpBoxes() {
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((box, i) => {

    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(-1);
      box.classList.toggle('filled', box.value !== '');
      if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        boxes[i - 1].value = '';
        boxes[i - 1].classList.remove('filled');
        boxes[i - 1].focus();
      }
    });

    // paste the whole code at once
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((char, idx) => {
        if (boxes[idx]) {
          boxes[idx].value = char;
          boxes[idx].classList.add('filled');
        }
      });
      const focus = boxes[Math.min(pasted.length, boxes.length - 1)];
      if (focus) focus.focus();
    });
  });
}

// ── Password strength meter ────────────────────────────────────────────────────

function setupPasswordStrength() {
  const input = document.getElementById('regPassword');
  const bar   = document.getElementById('pwStrength');
  if (!input || !bar) return;

  input.addEventListener('input', () => {
    const v = input.value;
    let score = 0;
    if (v.length >= 6)  score++;
    if (v.length >= 10) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/\d/.test(v) && /[^a-zA-Z0-9]/.test(v)) score++;

    const levels = ['', 'weak', 'fair', 'good', 'strong'];
    bar.innerHTML = [0,1,2,3].map(idx => `
      <div class="pw-strength-bar ${idx < score ? levels[score] : ''}"></div>
    `).join('');
  });
}

// ── Check URL for password reset token ────────────────────────────────────────

function checkResetToken() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('reset');
  if (!token) return;

  document.getElementById('resetToken').value = token;
  Auth.show('reset');
  window.history.replaceState({}, '', window.location.pathname);
}

// ── Form submit handlers ──────────────────────────────────────────────────────

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError('loginError');

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showError('loginError', 'Please enter your email and password.');
    return;
  }

  setLoading('loginBtn', true);
  try {
    const data = await post('/auth/login', { email, password });

    if (data.needsVerify) {
      Auth.pendingEmail = data.email;
      document.getElementById('otpEmailDisplay').textContent = data.email;
      Auth.startCountdown();
      Auth.show('otp');
      return;
    }

    if (data.error) { showError('loginError', data.error); return; }

    saveSession(data.token, data.user);
    window.location.href = 'app.html';
  } catch {
    showError('loginError', 'Cannot connect to server. Make sure the backend is running.');
  } finally {
    setLoading('loginBtn', false);
  }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError('registerError');

  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!name || !email || !password) {
    showError('registerError', 'All three fields are required.');
    return;
  }
  if (password.length < 6) {
    showError('registerError', 'Password must be at least 6 characters.');
    return;
  }

  setLoading('registerBtn', true);
  try {
    const data = await post('/auth/register', { name, email, password });

    if (data.error) { showError('registerError', data.error); return; }

    Auth.pendingEmail = email;
    document.getElementById('otpEmailDisplay').textContent = email;
    Auth.startCountdown();
    Auth.show('otp');
  } catch {
    showError('registerError', 'Cannot connect to server. Make sure the backend is running.');
  } finally {
    setLoading('registerBtn', false);
  }
});

document.getElementById('otpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError('otpError');

  const boxes = document.querySelectorAll('.otp-box');
  const otp   = [...boxes].map(b => b.value).join('');

  if (otp.length < 6) {
    showError('otpError', 'Please enter the full 6-digit code.');
    return;
  }

  setLoading('otpBtn', true);
  try {
    const data = await post('/auth/verify-otp', { email: Auth.pendingEmail, otp });

    if (data.error) {
      showError('otpError', data.error);
      boxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
      boxes[0].focus();
      return;
    }

    saveSession(data.token, data.user);
    window.location.href = 'app.html';
  } catch {
    showError('otpError', 'Cannot connect to server. Please try again.');
  } finally {
    setLoading('otpBtn', false);
  }
});

document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError('forgotError');
  document.getElementById('forgotSuccess').classList.add('hidden');

  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) { showError('forgotError', 'Please enter your email address.'); return; }

  setLoading('forgotBtn', true);
  try {
    const data = await post('/auth/forgot-password', { email });
    if (data.error) { showError('forgotError', data.error); return; }
    showSuccess('forgotSuccess', data.message || 'Reset link sent! Check your inbox.');
    document.getElementById('forgotEmail').value = '';
  } catch {
    showError('forgotError', 'Cannot connect to server. Please try again.');
  } finally {
    setLoading('forgotBtn', false);
  }
});

document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError('resetError');
  document.getElementById('resetSuccess').classList.add('hidden');

  const token    = document.getElementById('resetToken').value;
  const password = document.getElementById('resetPw').value;
  const confirm  = document.getElementById('resetConfirm').value;

  if (!password || !confirm) { showError('resetError', 'Please fill in both fields.'); return; }
  if (password.length < 6)   { showError('resetError', 'Password must be at least 6 characters.'); return; }
  if (password !== confirm)   { showError('resetError', 'Passwords do not match.'); return; }

  setLoading('resetBtn', true);
  try {
    const data = await post('/auth/reset-password', { token, password });
    if (data.error) { showError('resetError', data.error); return; }
    showSuccess('resetSuccess', 'Password updated! Redirecting to sign in...');
    setTimeout(() => Auth.show('login'), 2000);
  } catch {
    showError('resetError', 'Cannot connect to server. Please try again.');
  } finally {
    setLoading('resetBtn', false);
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadTheme();
setupOtpBoxes();
setupPasswordStrength();
checkResetToken();

// already logged in — skip auth page
if (localStorage.getItem('bt_token') && localStorage.getItem('bt_user')) {
  window.location.href = 'app.html';
}
