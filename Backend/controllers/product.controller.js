// controllers/product.controller.js

exports.getALL = (req, res) => {
    res.json({ message: "Fetching all products..." });
};

exports.getOne = (req, res) => {
    res.json({ message: `Fetching product ${req.params.id}` });
};

exports.create = (req, res) => {
    console.log('Product Data:', req.body);
    res.status(201).json({ success: true, message: "Product created" });
};

exports.updateProduct = (req, res) => {
    res.json({ success: true, message: `Product ${req.params.id} updated` });
};