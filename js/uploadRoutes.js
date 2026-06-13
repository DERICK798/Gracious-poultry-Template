const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db'); // Path to your DB connection
const { authMiddleware } = require('../middleware/authMiddleware');

// Helper function to delete old files from the disk
const deleteOldFile = (relativeFilePath) => {
    if (!relativeFilePath || relativeFilePath.startsWith('http') || relativeFilePath.startsWith('data:')) {
        return;
    }

    // Resolve the relative path stored in DB to an absolute path on the server
    // e.g., '/uploads/avatars/file.jpg' -> 'C:/.../admin-panel/uploads/avatars/file.jpg'
    const absolutePath = path.join(__dirname, '..', relativeFilePath);

    fs.access(absolutePath, fs.constants.F_OK, (err) => {
        if (!err) {
            fs.unlink(absolutePath, (err) => {
                if (err) console.error(`Failed to delete file: ${absolutePath}`, err);
            });
        }
    });
};

// Configure Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Anchor to the project root to ensure files stay in the permanent 'uploads' folder
        const uploadPath = path.join(__dirname, '..', 'uploads', 'avatars');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Limit to 2MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error("Only images (jpeg, png, webp) are allowed"));
    }
});

// POST Route for Avatar Upload
router.post('/upload-avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const imageUrl = `/uploads/avatars/${req.file.filename}`;
        const userId = req.user.id; // Assuming authMiddleware attaches user to req

        // 1. Get current avatar to delete it if it exists
        const [rows] = await db.execute('SELECT profile_picture FROM users WHERE id = ?', [userId]);
        if (rows.length > 0 && rows[0].profile_picture) {
            deleteOldFile(rows[0].profile_picture);
        }

        // Update Database
        await db.execute('UPDATE users SET profile_picture = ? WHERE id = ?', [imageUrl, userId]);

        res.json({ imageUrl, message: 'Profile picture updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

module.exports = router;