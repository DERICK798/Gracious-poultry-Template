document.addEventListener("DOMContentLoaded", loadCart);

function loadCart() {
  const cartBody = document.getElementById("cartBody");
  const grandTotalEl = document.getElementById("grandTotal");

  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  cartBody.innerHTML = "";
  let grandTotal = 0;

  if (cart.length === 0) {
    cartBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;">Cart is empty</td>
      </tr>
    `;
    grandTotalEl.textContent = "0";
    return;
  }

  cart.forEach((item, index) => {
    const total = item.price * item.qty;
    grandTotal += total;

    cartBody.innerHTML += `
      <tr>
        <td>${item.name}</td>
        <td>${item.price}</td>
        <td>${item.qty}</td>
        <td>${total}</td>
        <td>
          <button onclick="removeFromCart(${index})">Remove</button>
        </td>
      </tr>
    `;
  });

  grandTotalEl.textContent = grandTotal;
}

function removeFromCart(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
}

function goToCheckout() {
  window.location.href = "checkout.html";
}
