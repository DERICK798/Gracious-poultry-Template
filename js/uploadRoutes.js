const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../Backend/config/cloudinary');
const db = require('../config/db'); // Path to your DB connection
const { authMiddleware } = require('../middleware/authMiddleware');

// Updated Helper: Deletes files from Cloudinary by extracting public_id from URL
const deleteCloudinaryFile = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary')) return;
  try {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v12345/avatars/avatar-6789.png
    const parts = imageUrl.split('/');
    const fileNameWithExt = parts.pop();
    const fileName = fileNameWithExt.split('.')[0];
    const folder = parts.pop();
    const publicId = `${folder}/${fileName}`;
    
    await cloudinary.uploader.destroy(publicId);
    console.log(`Successfully deleted: ${publicId}`);
  } catch (err) {
    console.error(`Failed to delete Cloudinary file: ${imageUrl}`, err);
  }
};

// Cloudinary Storage Configuration for Avatars
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'avatars',
        allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }
});

// POST Route for Avatar Upload
router.post('/upload-avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const imageUrl = req.file.path; // Secure Cloudinary URL
        const userId = req.user.id; // Assuming authMiddleware attaches user to req

        // 1. Get current avatar to delete it if it exists
        const [rows] = await db.execute('SELECT profile_picture FROM users WHERE id = ?', [userId]);
        if (rows.length > 0 && rows[0].profile_picture) {
            await deleteCloudinaryFile(rows[0].profile_picture);
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