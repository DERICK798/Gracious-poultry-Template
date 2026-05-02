const axios = require('axios');
const getToken = require('./mpesaAuth');

module.exports = async function stkPush(phone, amount, orderId) {
  console.log(`🚀 [STK Push] Initiating for Phone: ${phone}, Amount: ${amount}, Order: ${orderId}`);

  const token = await getToken();

  // Generate correct timestamp: YYYYMMDDHHMMSS
  const timestamp = new Date()
    .toLocaleString("sv-SE", { timeZone: "Africa/Nairobi" })
    .replace(/[^0-9]/g, '');

  // Generate password
  const password = Buffer.from(
    process.env.MPESA_SHORTCODE +
    process.env.MPESA_PASSKEY +
    timestamp
  ).toString('base64');

  console.log("Timestamp:", timestamp);
  console.log("Password:", password);

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: `ORDER-${orderId}`,
    TransactionDesc: 'Order Payment'
  };

  console.log(' [STK Push] Sending Payload:', { ...payload, Password: '***HIDDEN***' });

  try {
    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(' [STK Push] Response:', response.data);
    return response.data;
  } catch (error) {
    console.error(' [STK Push] Error:', error.response ? error.response.data : error.message);
    throw error;
  }
};
