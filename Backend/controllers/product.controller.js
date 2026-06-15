// controllers/product.controller.js
const db = require('../config/db');

exports.getALL = async (req, res) => {
    try {
        const [products] = await db.promise().query("SELECT * FROM product ORDER BY id DESC");
        res.json(products);
    } catch (err) {
        console.error("GET PRODUCTS ERROR:", err);
        res.status(500).json({ message: "Failed to load products" });
    }
};

exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.promise().query("SELECT * FROM product WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ message: "Product not found" });
        res.json(rows[0]);
    } catch (err) {
        console.error("GET ONE ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, category, price, description, image, image2, quantity } = req.body;
        const [result] = await db.promise().query(
            "INSERT INTO product (name, category, price, description, image, image2, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name, category, price, description, image, image2, quantity]
        );
        res.status(201).json({ success: true, message: "Product created", id: result.insertId });
    } catch (err) {
        console.error("CREATE PRODUCT ERROR:", err);
        res.status(500).json({ message: "Failed to create product" });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, price, description, image, image2, quantity } = req.body;
        await db.promise().query(
            "UPDATE product SET name=?, category=?, price=?, description=?, image=?, image2=?, quantity=? WHERE id=?",
            [name, category, price, description, image, image2, quantity, id]
        );
        res.json({ success: true, message: `Product ${id} updated` });
    } catch (err) {
        console.error("UPDATE ERROR:", err);
        res.status(500).json({ message: "Failed to update product" });
    }
};