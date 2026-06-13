require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const authRoutes = require('./routes/auth.routes');
const clientRoutes = require('./routes/client.routes');
const mpesaRoutes = require('./routes/mpesa.routes');
const orderRoutes = require('./routes/orders.routes');
const productRoutes = require('./routes/products.routes');
const userRoutes = require('./routes/users.routes');
const adminRoutes = require('./routes/admin.routes');
const app = express();

app.use(cors({
  origin: [
    "https://derick798.github.io", 
    "https://gracious-poultry-onlineshop.onrender.com"
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESSION
app.use(session({
    secret: process.env.SESSION_SECRET || '071788634o838068962nesh',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Prioritize Admin assets. If not found, Express will 'next()' to the public static folder
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/js', express.static(path.join(__dirname, '..', 'frontend', 'public', 'js')));

app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/css', express.static(path.join(__dirname, '..', 'frontend', 'public', 'css')));

// Main frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// Serving uploads from the root project directory to match Multer config
const uploadsPath = path.join(__dirname, '..', 'uploads');

// Ensure base directories exist to prevent "Folder not found" errors on upload
['', 'avatars', 'products'].forEach(dir => {
    const p = path.join(uploadsPath, dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

app.use("/uploads", express.static(uploadsPath));

// APIs
app.use('/api/auth', authRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// pages
app.get('/', (req,res)=>{
   res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

app.get(['/dashboard', '/dashboard.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

app.get(['/admin-login', '/admin-login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-login.html'));
});

app.get(['/admin-register', '/admin-register.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-register.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
   console.log(`Server running on http://localhost:${PORT}`);
});