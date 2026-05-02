document.addEventListener("DOMContentLoaded", () => {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const user = JSON.parse(localStorage.getItem("user")); // For logged-in users

  const orderItemsEl = document.getElementById("order-items");
  const orderTotalEl = document.getElementById("order-total");
  const phoneInput = document.getElementById("phone");
  const mpesaBtn = document.getElementById("mpesa-btn");
  const messageEl = document.getElementById("message");

  // 1. Display Order Summary
  function displaySummary() {
    if (cart.length === 0) {
      orderItemsEl.innerHTML = "<li>Your cart is empty.</li>";
      mpesaBtn.disabled = true;
      return;
    }

    let total = 0;
    orderItemsEl.innerHTML = "";
    cart.forEach(item => {
      total += item.price * item.qty;
      const li = document.createElement("li");
      li.textContent = `${item.name} (x${item.qty}) - KES ${item.price * item.qty}`;
      orderItemsEl.appendChild(li);
    });
    orderTotalEl.textContent = total;

    // Pre-fill phone number if user is logged in
    if (user && user.phone) {
      phoneInput.value = user.phone;
    }
  }

  // 2. Handle M-Pesa Payment
  async function handleMpesaPayment() {
    const phone = phoneInput.value;
    const location = document.getElementById("location").value;

    if (!phone || !location) {
      showMessage("Please fill in your phone number and location.", "error");
      return;
    }

    if (cart.length === 0) {
      showMessage("Your cart is empty.", "error");
      return;
    }

    mpesaBtn.disabled = true;
    mpesaBtn.textContent = "Processing...";
    showMessage("Please wait while we create your order...", "info");
    console.log("🛒 [Checkout] Starting M-Pesa payment flow for:", phone);

    try {
      // Step 1: Create the order to get an orderId and final total
      const orderProducts = cart.map(item => ({
        id: item.id, // Use 'id' to match the backend controller's expectation
        quantity: item.qty || 1, // Ensure quantity is valid, defaulting to 1
        price: item.price,
        name: item.name
      }));

      console.log("🛒 [Checkout] Creating order...");
      const token = localStorage.getItem("token"); // Retrieve JWT token
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          phone,
          location,
          payment_method: 'mpesa',
          products: orderProducts
        })
      });

      const orderData = await orderRes.json();
      // IMPORTANT: Your backend must return { orderId, total } on success
      if (!orderRes.ok || !orderData.orderId || !orderData.total) {
        throw new Error(orderData.message || 'Failed to create order.');
      }
      
      const { orderId, total } = orderData;
      console.log(`🛒 [Checkout] Order created. ID: ${orderId}, Total: ${total}`);

      // Step 2: Initiate STK Push with the new orderId and backend-verified total
      showMessage("Order created. Sending payment request to your phone...", "info");
      console.log("🛒 [Checkout] Initiating STK Push...");
      const mpesaRes = await fetch('/api/mpesa/pay', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ phone, amount: total, orderId })
      });

      const mpesaData = await mpesaRes.json();
      console.log("🛒 [Checkout] STK Push Response:", mpesaData);
      if (!mpesaRes.ok) {
        throw new Error(mpesaData.error || mpesaData.message || 'M-Pesa payment initiation failed.');
      }

      // Success!
      showMessage("STK Push sent! Please check your phone to enter your M-Pesa PIN and complete the payment.", "success");
      localStorage.removeItem("cart"); // Clear cart after successful initiation
      setTimeout(() => {
        // Redirect to a "my orders" page or a success page
        window.location.href = '/profile.html'; 
      }, 5000);

    } catch (err) {
      console.error("Payment Error:", err);
      showMessage(err.message, "error");
      mpesaBtn.disabled = false;
      mpesaBtn.textContent = "Pay with M-Pesa";
    }
  }

  // 3. Helper to show messages
  function showMessage(msg, type) {
    messageEl.textContent = msg;
    messageEl.className = type;
    messageEl.style.display = "block";
  }

  mpesaBtn.addEventListener("click", handleMpesaPayment);
  displaySummary();
});