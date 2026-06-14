const express = require('express');
const router = express.Router();
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../Backend/config/cloudinary');
const db = require('../config/db'); // Path to your DB connection
const { authMiddleware } = require('../middleware/authMiddleware');

// Updated Helper: Deletes files from Cloudinary by extracting public_id from URL
const deleteCloudinaryFile = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary')) return;
  try {
    // More robust way to get public_id: get everything between the version and the extension
    // regex matches 'folder/filename' from a standard Cloudinary URL
    const regex = /\/v\d+\/([^/]+\/[^.]+)\./;
    const match = imageUrl.match(regex);
    const publicId = match ? match[1] : null;
    
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Successfully deleted: ${publicId}`);
    }
  } catch (err) {
    console.error(`Failed to delete Cloudinary file: ${imageUrl}`, err);
  }
};

// Helper to upload a buffer to Cloudinary via stream
const streamUpload = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, transformation: [{ width: 500, height: 500, crop: 'limit' }] },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

// Multer Memory Storage
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

// POST Route for Avatar Upload
router.post('/upload-avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        // Upload using streamifier
        const result = await streamUpload(req.file.buffer, 'avatars');
        const imageUrl = result.secure_url;

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