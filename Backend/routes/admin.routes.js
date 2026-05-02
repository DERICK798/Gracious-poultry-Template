const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');

// Register new admin (Use this to create your first admin)
// NOTE: Temporarily removed authMiddleware and adminOnly to allow first admin setup.
// Add them back once you have created your first account.
router.post('/register', async (req, res) => {
  console.log(" Register Request:", req.body);
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    // Check if admin already exists
    const [existing] = await db.promise().query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Admin email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Saving to DB...");
    
    // Ensure your DB has an 'admins' table!
    await db.promise().query('INSERT INTO admins (email, password) VALUES (?, ?)', [email, hashedPassword]);
    console.log("✅ Saved!");

    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (err) {
    console.error('ADMIN REGISTER ERROR:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log('STEP 1: BODY', req.body);

    const { email, password } = req.body;

    console.log('STEP 2: QUERY DB');
  const [rows] = await db.promise().query(
  'SELECT * FROM admins WHERE email = ?',
  [email]
);

    console.log('STEP 3: ROWS', rows);

    if (!rows.length) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    console.log('STEP 4: COMPARE PASSWORD');
    const isMatch = await bcrypt.compare(password, rows[0].password);

    console.log('STEP 5: PASSWORD MATCH?', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // ✅ Set session for server-side page guards (server.js isAuthenticated)
    req.session.admin = { id: rows[0].id, email: rows[0].email };

    console.log('STEP 6: GENERATE TOKEN');
    if (!process.env.JWT_SECRET) {
      console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { id: rows[0].id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log('STEP 7: SEND RESPONSE');
    return res.json({ token });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get Dashboard Stats
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [userRows] = await db.promise().query('SELECT COUNT(*) as total FROM users');
    const [orderRows] = await db.promise().query('SELECT COUNT(*) as total, SUM(total) as revenue FROM orders');

    res.json({
      users: userRows[0].total,
      orders: orderRows[0].total,
      revenue: orderRows[0].revenue || 0
    });
  } catch (err) {
    console.error('STATS ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

module.exports = router;
