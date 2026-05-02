const bcrypt = require('bcrypt');

// Mock Database (Replace with a real DB query later)
const users = [
    {
        username: 'admin',
        passwordHash: '$2b$10$EpjXWzO2yzP.6N0vV.hSBeGzW.TjN.r5GZ1L3S6z.fG.Iu7z6G7G' 
    }
];

exports.login = async (req, res) => {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    try {
        const match = await bcrypt.compare(password, user.passwordHash);
        
        if (match) {
            // In production, sign a real JWT here
            res.json({ success: true, message: 'Login successful', token: 'mock-jwt-token' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};