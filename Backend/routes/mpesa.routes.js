const express = require('express');
const stkPush = require('../services/mpesaStk');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Helper to format phone number to 254... format
const normalizePhoneNumber = (phone) => {
  if (phone.startsWith('+254')) {
    return phone.substring(1);
  }
  if (phone.startsWith('0')) {
    return '254' + phone.substring(1);
  }
  return phone; // Assume it's already in 254... format
};

router.post('/pay', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, orderId } = req.body;
    console.log('📥 [M-Pesa Route] Received payment request:', { phone, orderId });

    if (!phone || !orderId) {
      return res.status(400).json({ message: 'Missing required payment data: phone and orderId.' });
    }

    // Verify that the order belongs to the authenticated user and get the correct total
    const [order] = await db.promise().query(
      'SELECT id, total FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (order.length === 0) {
      return res.status(403).json({ message: 'Unauthorized: This order does not belong to you.' });
    }

    // Use the amount from the database to prevent price manipulation
    const numericAmount = Number(order[0].total);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: 'Invalid order amount.' });
    }

    const formattedPhone = normalizePhoneNumber(phone);
    console.log(`📞 [M-Pesa Route] Normalized Phone: ${phone} -> ${formattedPhone}`);

    const result = await stkPush(formattedPhone, numericAmount, orderId);
    console.log('📤 [M-Pesa Route] STK Push Result:', result);

    // The M-Pesa API returns a ResponseCode. '0' means the request was accepted.
    if (result.ResponseCode === '0') {
        // Save the CheckoutRequestID to the order so we can identify it in the callback
        await db.promise().query(
            'UPDATE orders SET checkout_id = ? WHERE id = ?',
            [result.CheckoutRequestID, orderId]
        );

        res.json({
            message: 'STK Push sent successfully. Please check your phone to complete the payment.',
            result
        });
    } else {
        // If the API call was accepted but resulted in an error (e.g., invalid phone)
        res.status(400).json({
            message: 'STK Push failed.',
            error: result.ResponseDescription,
            result
        });
    }
  } catch (error) {
    console.error('MPESA PAY ERROR:', error);
    res.status(500).json({ message: 'An error occurred while initiating the payment.' });
  }
});

// Callback URL for Safaricom to report payment results
router.post('/callback', async (req, res) => {
    try {
        const { Body } = req.body;
        console.log('📡 [M-Pesa Callback] Received:', JSON.stringify(req.body, null, 2));

        if (!Body.stkCallback) {
            return res.status(400).json({ message: 'Invalid callback data' });
        }

        const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;

        // Extract M-Pesa Receipt Number from Metadata if payment was successful
        let mpesaReceipt = null;
        if (ResultCode === 0 && CallbackMetadata && CallbackMetadata.Item) {
            const receiptItem = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber');
            if (receiptItem) mpesaReceipt = receiptItem.Value;
        }

        // Update order status and store payment details
        const status = ResultCode === 0 ? 'Paid' : 'Cancelled';
        
        console.log(`📡 [M-Pesa Callback] Updating Order: ID ${CheckoutRequestID} -> Status: ${status}, Receipt: ${mpesaReceipt}`);

        await db.promise().query(
            "UPDATE orders SET status = ?, mpesa_receipt = ?, result_desc = ? WHERE checkout_id = ?",
            [status, mpesaReceipt, ResultDesc, CheckoutRequestID]
        );

        res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error) {
        console.error('CALLBACK ERROR:', error);
        res.status(500).json({ ResultCode: 1, ResultDesc: "Internal Error" });
    }
});

module.exports = router;
