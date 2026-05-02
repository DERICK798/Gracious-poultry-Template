const db = require('../config/db');

exports.createOrder = async (req, res) => {
  console.log('REQ BODY:', req.body);

  const userId = req.user.id; // Extracted from JWT via authMiddleware
  const { phone, location, payment_method, products } = req.body;

  if (!phone || !location || !payment_method || !products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: 'Invalid order data' });
  }

  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // 1. Check stock for all products and lock rows for update to prevent race conditions
    for (const product of products) {
      if (!product.id || !product.quantity || product.quantity <= 0) {
        throw new Error('Invalid product data in order. Each product must have an id and quantity.');
      }

      // This is where your requested logic goes, with added safety checks
      const [rows] = await connection.query(
        "SELECT quantity FROM product WHERE id = ? FOR UPDATE",
        [product.id]
      );

      if (rows.length === 0) {
        throw new Error(`Product with ID ${product.id} not found.`);
      }

      const availableStock = rows[0].quantity;
      if (availableStock < product.quantity) {
        throw new Error(`Not enough stock for product ${product.name || product.id}. Available: ${availableStock}, Requested: ${product.quantity}`);
      }
    }

    // 2. Calculate total correctly
    const total = products.reduce((sum, p) => sum + Number(p.price) * Number(p.quantity), 0);

    const orderQuery = `
      INSERT INTO orders (user_id, phone, location, payment_method, total, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    // 3. Save Order
    const [result] = await connection.query(orderQuery, [userId, phone, location, payment_method, total, 'Pending']);
    const orderId = result.insertId;

    // 4. Prepare and save order items
    const items = products.map(p => [
      orderId,
      p.id, // This is the product_id
      p.name || 'Unknown Product',
      Number(p.price),
      Number(p.quantity)
    ]);
    const itemQuery = `
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
      VALUES ?
    `;
    if (items.length > 0) {
      await connection.query(itemQuery, [items]);
    }

    // 5. Update stock for all products
    for (const product of products) {
      await connection.query("UPDATE product SET quantity = quantity - ? WHERE id = ?", [product.quantity, product.id]);
    }

    // 6. If all is well, commit the transaction
    await connection.commit();

    res.status(201).json({
      message: "Order placed successfully",
      orderId,
      total
    });
  } catch (err) {
    if (connection) await connection.rollback(); // Rollback on any error
    console.error('CREATE ORDER ERROR:', err);
    res.status(err.message.includes('Not enough stock') || err.message.includes('not found') ? 400 : 500).json({ message: err.message || 'Failed to create order' });
  } finally {
    if (connection) connection.release(); // Release connection back to the pool
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Expecting 'Pending', 'Delivered', or 'Cancelled'

  // If status is 'Cancelled', we need to restock products.
  if (status === 'Cancelled') {
    let connection;
    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();

      // 1. Get the current status to prevent re-stocking a non-deducted order
      const [currentOrder] = await connection.query('SELECT status FROM orders WHERE id = ?', [id]);
      if (currentOrder.length === 0) {
        throw new Error('Order not found.');
      }
      // Only restock if the order was in a state where stock was deducted (e.g., 'Pending')
      // and not already 'Delivered' or 'Cancelled'.
      if (currentOrder[0].status === 'Delivered' || currentOrder[0].status === 'Cancelled') {
        throw new Error(`Cannot cancel order that is already ${currentOrder[0].status}.`);
      }

      // 2. Get all items from the order
      const [items] = await connection.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);

      // 3. Restore the quantity for each product
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          await connection.query(
            'UPDATE product SET quantity = quantity + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }

      // 4. Update the order status to 'Cancelled'
      await connection.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

      // 5. Commit transaction
      await connection.commit();

      res.json({ message: 'Order cancelled and products restocked successfully' });

    } catch (err) {
      if (connection) await connection.rollback();
      console.error('CANCEL ORDER ERROR:', err);
      res.status(500).json({ message: err.message || 'Failed to cancel order' });
    } finally {
      if (connection) connection.release();
    }
  } else {
    // Original logic for other status updates
    const sql = 'UPDATE orders SET status = ? WHERE id = ?';
    try {
      await db.promise().query(sql, [status, id]);
      res.json({ message: 'Order status updated successfully' });
    } catch (err) {
      console.error('UPDATE STATUS ERROR:', err);
      res.status(500).json({ message: 'Failed to update status' });
    }
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get Order Details
    const [orders] = await db.promise().query('SELECT * FROM orders WHERE id = ?', [id]);
    
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];

    // 2. Get Products for this order
    const [items] = await db.promise().query('SELECT * FROM order_items WHERE order_id = ?', [id]);

    // 3. Combine and send
    order.items = items;
    res.json(order);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteOrder = async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // 1. Check order status before deleting
    const [orders] = await connection.query('SELECT status FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      // If order doesn't exist, it's already "deleted".
      await connection.commit();
      return res.json({ message: 'Order deleted successfully' });
    }
    const orderStatus = orders[0].status;

    // 2. If order was not delivered or already cancelled, restock items
    if (orderStatus !== 'Delivered' && orderStatus !== 'Cancelled') {
      const [items] = await connection.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          await connection.query(
            'UPDATE product SET quantity = quantity + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }
    }

    // 3. Delete order items and then the order
    await connection.query('DELETE FROM order_items WHERE order_id = ?', [id]);
    await connection.query('DELETE FROM orders WHERE id = ?', [id]);

    await connection.commit();
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('DELETE ORDER ERROR:', err);
    res.status(500).json({ message: err.message || 'Failed to delete order' });
  } finally {
    if (connection) connection.release();
  }
};

exports.getOrders = async (req, res) => {
  try {
    const [results] = await db.promise().query("SELECT * FROM orders ORDER BY id DESC");
    res.json(results);
  } catch (err) {
    console.error('ORDERS FETCH ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};
