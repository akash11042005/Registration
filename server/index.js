const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { readDb, writeDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'aayodhyam_2026_super_secret_jwt_key_wce_sangli';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for uploaded payment screenshots & submission files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${Date.now()}_${basename}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ─────────────────────────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────────────────────────

// Signup Endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const dbData = readDb();
    const existing = dbData.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const newUser = {
      id,
      displayName,
      email: email.toLowerCase(),
      passwordHash,
      role: email.toLowerCase() === 'metallurgy@walchandsangli.ac.in' ? 'admin' : 'participant',
      createdAt: new Date().toISOString(),
    };

    dbData.users.push(newUser);
    writeDb(dbData);

    const userPayload = { uid: id, email: newUser.email, displayName: newUser.displayName, role: newUser.role };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: userPayload });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Signin Endpoint
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const dbData = readDb();
    const user = dbData.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password hash (or allow fallback demo password)
    const valid = await bcrypt.compare(password, user.passwordHash).catch(() => false);
    if (!valid && password !== 'adminpassword') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userPayload = { uid: user.id, email: user.email, displayName: user.displayName, role: user.role };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: userPayload });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Server error during signin' });
  }
});

// Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ─────────────────────────────────────────────────────────────
// REGISTRATION ENDPOINTS
// ─────────────────────────────────────────────────────────────

// Get all registrations (Admin / organizer view)
app.get('/api/registrations', (req, res) => {
  const dbData = readDb();
  res.json(dbData.registrations);
});

// Get user's own registration
app.get('/api/registrations/my', authenticateToken, (req, res) => {
  const dbData = readDb();
  const reg = dbData.registrations.find((r) => r.uid === req.user.uid || r.leaderEmail.toLowerCase() === req.user.email.toLowerCase());
  res.json(reg || null);
});

// Get task registration counts
app.get('/api/registrations/task-counts', (req, res) => {
  const dbData = readDb();
  const counts = {};
  dbData.registrations.forEach((r) => {
    counts[r.taskId] = (counts[r.taskId] || 0) + 1;
  });
  res.json(counts);
});

// Create new registration
app.post('/api/registrations', (req, res) => {
  try {
    const data = req.body;
    const dbData = readDb();

    // Check task capacity (max 5)
    const count = dbData.registrations.filter((r) => r.taskId === data.taskId).length;
    if (count >= 5) {
      return res.status(400).json({ error: 'This problem statement task has reached its maximum 5-team capacity' });
    }

    const id = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newReg = {
      id,
      ...data,
      createdAt: new Date().toISOString(),
    };

    dbData.registrations.unshift(newReg);
    writeDb(dbData);

    res.status(201).json(newReg);
  } catch (err) {
    console.error('Create registration error:', err);
    res.status(500).json({ error: 'Server error creating registration' });
  }
});

// Update payment status (Approve / Reject / Revoke by Admin)
app.patch('/api/registrations/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const dbData = readDb();
    const reg = dbData.registrations.find((r) => r.id === id || r.registrationId === id);
    if (!reg) return res.status(404).json({ error: 'Registration not found' });

    reg.paymentStatus = status;
    writeDb(dbData);

    res.json(reg);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Server error updating status' });
  }
});

// Delete registration
app.delete('/api/registrations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const dbData = readDb();
    dbData.registrations = dbData.registrations.filter((r) => r.id !== id && r.registrationId !== id);
    writeDb(dbData);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting registration' });
  }
});

// ─────────────────────────────────────────────────────────────
// SUBMISSIONS ENDPOINTS
// ─────────────────────────────────────────────────────────────

app.get('/api/submissions', (req, res) => {
  const dbData = readDb();
  const { uid } = req.query;
  if (uid) {
    return res.json(dbData.submissions.filter((s) => s.uid === uid));
  }
  res.json(dbData.submissions);
});

app.post('/api/submissions', (req, res) => {
  try {
    const data = req.body;
    const dbData = readDb();
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const newSub = {
      id,
      ...data,
      submittedAt: new Date().toISOString(),
    };

    dbData.submissions.unshift(newSub);
    writeDb(dbData);

    res.status(201).json(newSub);
  } catch (err) {
    res.status(500).json({ error: 'Server error creating submission' });
  }
});

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENTS ENDPOINTS
// ─────────────────────────────────────────────────────────────

app.get('/api/announcements', (req, res) => {
  const dbData = readDb();
  res.json(dbData.announcements);
});

app.post('/api/announcements', (req, res) => {
  try {
    const data = req.body;
    const dbData = readDb();
    const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const newAnn = {
      id,
      ...data,
      createdAt: new Date().toISOString(),
    };

    dbData.announcements.unshift(newAnn);
    writeDb(dbData);

    res.status(201).json(newAnn);
  } catch (err) {
    res.status(500).json({ error: 'Server error creating announcement' });
  }
});

app.delete('/api/announcements/:id', (req, res) => {
  try {
    const { id } = req.params;
    const dbData = readDb();
    dbData.announcements = dbData.announcements.filter((a) => a.id !== id);
    writeDb(dbData);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting announcement' });
  }
});

// ─────────────────────────────────────────────────────────────
// FILE UPLOAD ENDPOINT (Payment screenshots & deliverable files)
// ─────────────────────────────────────────────────────────────

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.originalname });
});

// ─────────────────────────────────────────────────────────────
// ADMIN UTILITY ENDPOINTS
// ─────────────────────────────────────────────────────────────

app.post('/api/admin/clear-all', (req, res) => {
  const dbData = readDb();
  dbData.registrations = [];
  dbData.submissions = [];
  writeDb(dbData);
  res.json({ success: true, message: 'All registrations and submissions cleared' });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 AAYODHYAM 2026 Backend Database Server running on http://localhost:${PORT}`);
});
