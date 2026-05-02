const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
  const { username, email, phone, password } = req.body;

  if (!username || !email || !phone || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [existingUsers] = await db.promise().query(
      'SELECT id FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.promise().query(
      'INSERT INTO users (username, email, phone, password) VALUES (?, ?, ?, ?)',
      [username, email, phone, hashedPassword]
    );

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId
    });

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    const { emailOrPhone, email, phone, password } = req.body;
    const identifier = emailOrPhone || email || phone;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/Phone and password are required' });
    }

    const [rows] = await db.promise().query(
      'SELECT * FROM users WHERE email = ? OR phone = ?',
      [identifier, identifier]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      console.error("FATAL ERROR: JWT_SECRET is not defined.");
      return res.status(500).json({ message: 'Internal server configuration error' });
    }

    const token = jwt.sign(
      { id: user.id, role: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email, phone: user.phone }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ================= OTHER ACTIONS ================= */
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const userId = req.user.id;
    const imageUrl = `/uploads/${req.file.filename}`;
    await db.promise().query('UPDATE users SET profile_picture = ? WHERE id = ?', [imageUrl, userId]);
    res.json({ message: 'Avatar updated', imageUrl });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const [countRows] = await db.promise().query("SELECT COUNT(*) as total FROM users");
    const total = countRows[0]?.total || 0;
    const [users] = await db.promise().query('SELECT id, username as name, email, created_at, profile_picture FROM users ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
    res.json({ data: users, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    console.error("USERS LOAD ERROR:", err);
    res.status(500).json({ message: "Failed to load users" });
  }
};