const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const authMiddleware = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');

// Helper to upload a buffer to Cloudinary via stream
const streamUpload = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder },
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
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Helper: Deletes files from Cloudinary by extracting public_id from URL
const deleteCloudinaryFile = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary')) return;
  try {
    const regex = /\/v\d+\/([^/]+\/[^.]+)\./;
    const match = imageUrl.match(regex);
    const publicId = match ? match[1] : null;
    if (publicId) await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Deletion failed: ${imageUrl}`, err);
  }
};

// admin routes
// POST /api/products
router.post('/', authMiddleware, adminOnly, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image2', maxCount: 1 }]), async (req, res) => {
  try {
    // Ensure values are present and not the literal string "null"
    const name = (req.body.name === 'null' || !req.body.name) ? null : String(req.body.name).trim();
    const category = (req.body.category === 'null' || !req.body.category) ? 'Uncategorized' : String(req.body.category).trim();
    const price = parseFloat(req.body.price);
    const quantity = parseInt(req.body.quantity);
    const description = String(req.body.description || '').trim();

    if (!name || isNaN(price) || isNaN(quantity) || price < 0 || quantity < 0) {
      return res.status(400).json({ message: "Invalid product data: Valid Name, Price, and Quantity are required." });
    }
    
    let image = null;
    let image2 = null;
    if (req.files) {
      if (req.files['image']) {
        image = (await streamUpload(req.files['image'][0].buffer, 'products')).secure_url;
      }
      if (req.files['image2']) {
        image2 = (await streamUpload(req.files['image2'][0].buffer, 'products')).secure_url;
      }
    }

    // Check if product already exists
    const [existing] = await db.promise().query("SELECT id, price FROM product WHERE name = ?", [name]);

    if (existing.length > 0) {
      const product = existing[0];
      const qtyToAdd = parseInt(quantity) || 0;

      let updateQuery = "UPDATE product SET quantity = quantity + ?";
      const updateParams = [qtyToAdd];

      if (price) {
        updateQuery += ", price = ?";
        updateParams.push(price);
      }

      updateQuery += " WHERE id = ?";
      updateParams.push(product.id);

      await db.promise().query(updateQuery, updateParams);
      return res.status(200).json({ message: "Product already exists. Stock and price updated successfully." });
    }

    await db.promise().query(
      "INSERT INTO product (name, category, price, description, image, image2, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, category, price, description, image, image2, quantity]
    );
    res.status(201).json({ message: "Product added successfully" });
  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to add product" });
  }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, adminOnly, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image2', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const name = (req.body.name === 'null' || !req.body.name) ? null : req.body.name.trim();
    const category = (req.body.category === 'null' || !req.body.category) ? 'Uncategorized' : req.body.category.trim();
    const price = parseFloat(req.body.price);
    const quantity = parseInt(req.body.quantity);
    const description = req.body.description || '';

    // Get existing product to check for old images
    const [rows] = await db.promise().query("SELECT image, image2 FROM product WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Product not found" });
    const oldProduct = rows[0];

    // Handle new uploads or keep existing paths from body
    let image = req.body.image;
    let image2 = req.body.image2;

    if (req.files) {
      if (req.files['image']) {
        const result = await streamUpload(req.files['image'][0].buffer, 'products');
        image = result.secure_url;
      }
      if (req.files['image2']) {
        const result = await streamUpload(req.files['image2'][0].buffer, 'products');
        image2 = result.secure_url;
      }
    }

    // Sanitize literal 'null' strings that might come from frontend prompts
    if (image === 'null') image = null;
    if (image2 === 'null') image2 = null;

    // Cleanup Cloudinary if images were replaced with new files
    if (req.files && req.files['image'] && oldProduct.image) {
      await deleteCloudinaryFile(oldProduct.image);
    }
    if (req.files && req.files['image2'] && oldProduct.image2) {
      await deleteCloudinaryFile(oldProduct.image2);
    }

    if (!name || isNaN(price) || isNaN(quantity) || price < 0) return res.status(400).json({ message: "Invalid product data." });

    await db.promise().query(
      "UPDATE product SET name=?, category=?, price=?, description=?, image=?, image2=?, quantity=? WHERE id=?",
      [name, category, price, description, image, image2, quantity, id]
    );
    res.json({ message: "Product updated successfully" });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get existing product to retrieve Cloudinary URLs
    const [rows] = await db.promise().query("SELECT image, image2 FROM product WHERE id = ?", [id]);
    if (rows.length > 0) {
      const product = rows[0];
      // 2. Delete associated images from Cloudinary
      if (product.image) await deleteCloudinaryFile(product.image);
      if (product.image2) await deleteCloudinaryFile(product.image2);
    }

    await db.promise().query("DELETE FROM product WHERE id = ?", [id]);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

router.get('/', async (req, res) => {
  try {
    // Check if pagination is requested (Admin Dashboard)
    if (req.query.page || req.query.limit) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const [countRows] = await db.promise().query("SELECT COUNT(*) as total FROM product");
      const total = countRows[0] ? countRows[0].total : 0;
      const totalPages = Math.ceil(total / limit);

      const [products] = await db.promise().query(
        'SELECT * FROM product ORDER BY id DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );

      return res.json({
        data: products,
        page,
        totalPages,
        total
      });
    }

    // No pagination -> Client requesting all products
    const [products] = await db.promise().query("SELECT * FROM product ORDER BY id DESC");
    res.json(products);

  } catch (err) {
    console.error("PRODUCTS LOAD ERROR:", err);
    res.status(500).json({ message: "Failed to load products" });
  }
});

module.exports = router;
