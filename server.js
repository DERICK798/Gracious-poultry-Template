require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

const authRoutes = require('./Backend/routes/auth.routes');
const clientRoutes = require('./Backend/routes/client.routes');
const mpesaRoutes = require('./Backend/routes/mpesa.routes');
const orderRoutes = require('./Backend/routes/orders.routes');
const productRoutes = require('./Backend/routes/products.routes');
const userRoutes = require('./Backend/routes/users.routes');
const adminRoutes = require('./Backend/routes/admin.routes');
const app = express();

app.use(cors({
    origin: true,
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

// frontend files
app.use(express.static(path.join(__dirname, 'frontend', 'public')));
app.use("/uploads", express.static(path.join(__dirname,'frontend',"uploads")));

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
   res.sendFile(path.join(__dirname,'frontend','public','index.html'));
});

app.get('/admin-login', (req, res) => {
   res.sendFile(path.join(__dirname, 'frontend', 'public', 'admin-login.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
   console.log(`Server running on http://localhost:${PORT}`);
});