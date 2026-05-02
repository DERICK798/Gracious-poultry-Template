const axios = require('axios');

async function getMpesaAccessToken() {
  const consumerKey = (process.env.MPESA_CONSUMER_KEY || '').trim();
  const consumerSecret = (process.env.MPESA_CONSUMER_SECRET || '').trim();

  if (!consumerKey || !consumerSecret) {
    console.error('❌ [M-Pesa Auth] Error: MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is missing in .env');
    throw new Error('M-Pesa credentials not configured. Check your .env file.');
  }

  const auth = Buffer.from(
    `${consumerKey}:${consumerSecret}`
  ).toString('base64');

  console.log(' [M-Pesa Auth] Requesting Access Token...');
  try {
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    if (response.data && response.data.access_token) {
      console.log('✅ [M-Pesa Auth] Token received successfully.');
      return response.data.access_token;
    } else {
      throw new Error('Access token not found in Safaricom response');
    }
    
  } catch (error) {
    const status = error.response ? error.response.status : 'Network Error';
    const data = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ [M-Pesa Auth] Error (${status}):`, data);
    throw new Error(`M-Pesa Authentication Failed: ${status}`);
  }
}

module.exports = getMpesaAccessToken;
