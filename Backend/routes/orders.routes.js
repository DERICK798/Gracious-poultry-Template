const db = require('../config/db'); 
const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders.controller');
const authMiddleware = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');

router.post('/', authMiddleware, ordersController.createOrder);

// CLIENT ROUTE: Get my orders
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User ID missing" });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 5)); 
    const offset = (page - 1) * limit;

    const [countRows] = await db.promise().query(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = ?', 
      [userId]
    );
    const total = countRows[0] ? countRows[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    const [orders] = await db.promise().query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );

    res.json({ data: orders, page, totalPages, total });
  } catch (err) {
    console.error("MY ORDERS ERROR:", err.message);
    res.status(500).json({ message: "Failed to load orders" });
  }
});

router.get('/:id', authMiddleware, adminOnly, ordersController.getOrderById);
router.put('/:id/status', authMiddleware, adminOnly, ordersController.updateOrderStatus);
router.delete('/:id', authMiddleware, adminOnly, ordersController.deleteOrder);

router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const search = req.query.search || "";
    const status = req.query.status || "";
    const offset = (page - 1) * limit;

    // Base queries
    let countQuery = "SELECT COUNT(*) AS total FROM orders WHERE 1=1";
    let dataQuery = "SELECT * FROM orders WHERE 1=1";
    let params = [];

    // Add Search Logic
    if (search) {
      const searchClause = " AND (phone LIKE ? OR id LIKE ?)";
      countQuery += searchClause;
      dataQuery += searchClause;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add Status Filter
    if (status) {
      const statusClause = " AND status = ?";
      countQuery += statusClause;
      dataQuery += statusClause;
      params.push(status);
    }

    // count
    // We use the same params for count (if search exists)
    const [countRows] = await db.promise().query(countQuery, params);
    const total = countRows[0] ? countRows[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    // orders
    dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    // Add limit and offset to the parameters array for safe querying
    const finalParams = [...params, limit, offset];
    const [orders] = await db.promise().query(dataQuery, finalParams);

    res.json({
      data: orders,
      page,
      totalPages,
      total
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to load orders"
    });
  }
});

module.exports = router;
