const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const authMiddleware = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');

// Cloudinary Storage Configuration for Products
const productStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'products',
        allowed_formats: ['jpg', 'png', 'webp', 'jpeg']
    }
});

const upload = multer({ storage: productStorage });

// Helper: Deletes files from Cloudinary by extracting public_id from URL
const deleteCloudinaryFile = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary')) return;
  try {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1/products/prod-123.png
    const parts = imageUrl.split('/');
    const fileNameWithExt = parts.pop();
    const fileName = fileNameWithExt.split('.')[0];
    const folder = parts.pop();
    const publicId = `${folder}/${fileName}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Deletion failed: ${imageUrl}`, err);
  }
};

// admin routes
// POST /api/products
router.post('/', authMiddleware, adminOnly, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image2', maxCount: 1 }]), async (req, res) => {
  try {
    // Ensure values are present and not the literal string "null"
    const name = (req.body.name === 'null' || !req.body.name) ? null : req.body.name.trim();
    const category = (req.body.category === 'null' || !req.body.category) ? 'Uncategorized' : req.body.category.trim();
    const price = req.body.price ? parseFloat(req.body.price) : 0;
    const quantity = req.body.quantity ? parseInt(req.body.quantity) : 0;
    const description = req.body.description || '';

    if (!name || price < 0 || quantity < 0) {
      return res.status(400).json({ message: "Invalid product data: Name is required, price/quantity cannot be negative." });
    }
    
    const image = (req.files && req.files['image']) ? req.files['image'][0].path : null;
    const image2 = (req.files && req.files['image2']) ? req.files['image2'][0].path : null;

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
    const price = req.body.price ? parseFloat(req.body.price) : 0;
    const quantity = req.body.quantity ? parseInt(req.body.quantity) : 0;
    const description = req.body.description || '';

    // Get existing product to check for old images
    const [rows] = await db.promise().query("SELECT image, image2 FROM product WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Product not found" });
    const oldProduct = rows[0];

    // Handle new uploads or keep existing paths from body
    let image = (req.files && req.files['image']) ? req.files['image'][0].path : req.body.image;
    let image2 = (req.files && req.files['image2']) ? req.files['image2'][0].path : req.body.image2;

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

    if (!name || price < 0) return res.status(400).json({ message: "Invalid name or price." });

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
