// GLOBAL CART
var API_URL = API_URL || (window.location.origin.includes('5000') ? '' : 'https://gracious-poultry-onlineshop.onrender.com');

let cart = JSON.parse(localStorage.getItem('cart')) || [];

function addToCart(product, qty) {
  if (!qty || qty < 1) qty = 1;

  const exist = cart.find(item => item.id === product.id);
  const price = Number(product.price);

  if (exist) {
    exist.qty += qty;
    exist.total = exist.qty * exist.price;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: price,
      image: product.image,
      qty: qty,
      total: price * qty
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  alert(product.name + ' added to cart');
}

//stars control
function renderStars(rating) {
  let starsHTML = "";

  for (let i = 1; i <= 5; i++) {
    starsHTML += `
      <span class="star ${i <= rating ? "active" : ""}" data-value="${i}">
        ★
      </span>
    `;
  }

  return starsHTML;
}

// Update cart count in header
function updateCartCount() {
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
    // Use 'qty' for consistency with the rest of the app
    const totalQty = cart.reduce((sum, it) => {
      const q = parseInt(it.qty, 10);
      return sum + (Number.isFinite(q) && q > 0 ? q : 0);
    }, 0);
    cartCountEl.textContent = totalQty;
    }
}

// Product-level quick quantity/total helpers — only initialize when relevant elements exist
const priceElement = document.querySelector(".price");
const qtyInput = document.querySelector(".qty-input");
const minusBtn = document.querySelector(".minus");
const plusBtn = document.querySelector(".plus");
const totalPrice = document.querySelector(".total-price");

let pricePerKg = 0;
if (priceElement) {
  const raw = priceElement.getAttribute("data-price");
  pricePerKg = parseInt(raw, 10) || 0;
}

function updateTotal() {
  if (!qtyInput || !totalPrice) return;
  let qty = parseInt(qtyInput.value, 10) || 0;
  totalPrice.textContent = qty * pricePerKg;
}

// Attach handlers only if controls exist on the page
if (plusBtn && minusBtn && qtyInput) {
  // Increase quantity
  plusBtn.addEventListener("click", () => {
    qtyInput.value = (parseInt(qtyInput.value, 10) || 0) + 1;
    updateTotal();
  });

  // Decrease quantity
  minusBtn.addEventListener("click", () => {
    const v = parseInt(qtyInput.value, 10) || 1;
    if (v > 1) {
      qtyInput.value = v - 1;
      updateTotal();
    }
  });

  // Manual input
  qtyInput.addEventListener("input", updateTotal);
}

// Update cart count on page load
updateCartCount();

// Optional: Add category filter
const categoryFilter = document.getElementById('categoryFilter');
const searchInput = document.getElementById('searchInput');

document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();
});
//fetch of products

function fetchProducts() {
  fetch(`${API_URL}/api/products`)
    .then(res => res.json())
    .then(products => renderProducts(products))
    .catch(err => console.error(err));
}

function renderProducts(products) {
  const container = document.getElementById("products-container");
  if (!container) return;

  container.innerHTML = "";

  // 1️⃣ GROUP PRODUCTS BY CATEGORY
  const grouped = {};

  products.forEach(product => {
    const category = product.category || "Other";

    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(product);
  });

  // 2️⃣ RENDER EACH CATEGORY
  Object.keys(grouped).forEach(category => {
    // CATEGORY TITLE
    const categorySection = document.createElement("section");
    categorySection.className = "category-section";

    const title = document.createElement("h2");
    title.textContent = category;
    categorySection.appendChild(title);

    // PRODUCTS ROW
    const row = document.createElement("div");
    row.className = "product-row";

    grouped[category].forEach(product => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.setAttribute('data-category', product.category || '');
      card.setAttribute('data-product-id', product.id);

      // --- Image Preview Logic ---
      const images = [product.image, product.image2].filter(Boolean);
      let imageHTML = '';
      if (images.length > 1) {
        imageHTML = `
          <div class="image-container">
              <img src="${API_URL}/uploads/${images[0]}" alt="${product.name}" class="main-product-image">
          </div>
          <div class="image-previews">
              ${images.map(img => `<img src="${API_URL}/uploads/${img}" alt="preview" class="preview-thumb">`).join('')}
          </div>
        `;
      } else if (images.length > 0) {
        imageHTML = `<img src="${API_URL}/uploads/${images[0]}" alt="${product.name}">`;
      }

      // --- Price & Discount Logic ---
      let priceHTML = '';
      let finalPrice = parseFloat(product.price);
      const discount = parseFloat(product.discount);

      if (!isNaN(discount) && discount > 0) {
        const discountedPrice = Math.round(finalPrice * (1 - discount / 100));
        priceHTML = `
          <div class="price" data-price="${finalPrice}" data-discount="${discount}">
            <span class="orig">KES ${finalPrice.toLocaleString()}</span>
            <span class="disc">KES ${discountedPrice.toLocaleString()}</span>
          </div>
        `;
        finalPrice = discountedPrice;
      } else {
        priceHTML = `
          <div class="price" data-price="${finalPrice}">
            KES ${finalPrice.toLocaleString()}
          </div>
        `;
      }

      const productForCart = { ...product, price: finalPrice };

      card.innerHTML = `
        ${imageHTML}
        <h3>${product.name}</h3>
        <div class="rating">
          ${renderStars(product.rating || 0)}
          <span class="rating-value">(${product.rating || 0})</span>
        </div>
        ${priceHTML}
        <div class="quantity-container">
          <button class="minus">-</button>
          <input type="number" class="qty-input" value="1" min="1" step="1">
          <button class="plus">+</button>
        </div>
        <button class="btn-shop" data-name="${product.name}">Add to Cart</button>
      `;

      // --- Attach Event Listeners ---
      const stars = card.querySelectorAll(".star");
    const ratingValue = card.querySelector(".rating-value");
    stars.forEach(star => {
      star.addEventListener("click", () => {
        const selectedRating = Number(star.dataset.value);

        stars.forEach(s =>
          s.classList.toggle("active", Number(s.dataset.value) <= selectedRating)
        );

        ratingValue.textContent = `(${selectedRating})`;
        console.log("Rated:", selectedRating);
        // TODO: Add API call to save rating
      });
    });

      if (images.length > 1) {
        const mainImg = card.querySelector('.main-product-image');
        card.querySelectorAll('.preview-thumb').forEach(thumb => {
          thumb.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (mainImg && thumb.src) {
              mainImg.src = thumb.src;
            }
          });
        });
      }

      const qtyInput = card.querySelector(".qty-input");
      const decBtn = card.querySelector(".minus");
      const incBtn = card.querySelector(".plus");
      const addBtn = card.querySelector(".btn-shop");

      const getStep = () => { const s = parseFloat(qtyInput.getAttribute('step')); return (Number.isFinite(s) && s > 0) ? s : 1; };
      const getMin = () => { const m = parseFloat(qtyInput.getAttribute('min')); return (Number.isFinite(m) && m > 0) ? m : 1; };

      decBtn.addEventListener('click', (e) => {
        e.preventDefault();
        let v = parseFloat(qtyInput.value) || getMin();
        const step = getStep();
        const min = getMin();
        v = Math.max(min, +(v - step));
        qtyInput.value = Number.isInteger(step) ? Math.round(v) : parseFloat(v.toFixed(2));
      });

      incBtn.addEventListener('click', (e) => {
        e.preventDefault();
        let v = parseFloat(qtyInput.value) || getMin();
        const step = getStep();
        v = +(v + step);
        qtyInput.value = Number.isInteger(step) ? Math.round(v) : parseFloat(v.toFixed(2));
      });

      addBtn.addEventListener("click", () => {
        addToCart(productForCart, Number(qtyInput.value));
      });

      row.appendChild(card);
    });

    categorySection.appendChild(row);
    container.appendChild(categorySection);
  });
}

if (categoryFilter && searchInput) {
  function filterProducts() {
    const category = categoryFilter.value;
    const search = searchInput.value.trim().toLowerCase();
    const products = document.querySelectorAll('.product-card');

    products.forEach(product => {
      const prodCategory = (product.getAttribute('data-category') || '').toLowerCase();
      const prodName = (product.querySelector('h3')?.textContent || '').toLowerCase();

      // Category selector must match (or be 'all')
      const matchesCategoryFilter = (category === 'all') || prodCategory === category || prodCategory.includes(category);

      // Search input matches either name OR category (or empty search matches everything)
      const matchesSearch = !search || prodName.includes(search) || prodCategory.includes(search);

      if (matchesCategoryFilter && matchesSearch) {
        product.style.display = 'block';
      } else {
        product.style.display = 'none';
      }
    });
  }

  categoryFilter.addEventListener('change', filterProducts);
  searchInput.addEventListener('keyup', filterProducts);
}

// ================== THEME TOGGLE ==================
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("themeToggle");
  const body = document.body;

  // Load saved mode
  if (localStorage.getItem("theme") === "dark" && body) {
    body.classList.add("dark-mode");
  }

  if (toggle && body) {
    toggle.addEventListener("click", () => {
      body.classList.toggle("dark-mode");

      // Save user preference
      if (body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
      } else {
        localStorage.setItem("theme", "light");
      }
    });
  }
});

// If on cart page, display cart items
if (document.getElementById('cartBody')) {
  const cartBody = document.getElementById('cartBody');
  const grandTotalEl = document.getElementById('grandTotal');

  try {
    // Defensive: ensure `cart` is an array (handle case where it's a JSON string)
    if (!Array.isArray(cart) && typeof cart === 'string') {
      try { cart = JSON.parse(cart); } catch (e) { console.warn('Could not parse cart string', e); cart = []; }
    }

    console.log('Cart data:', cart);

    // Helper to render cart contents (call after changes)
    function renderCart() {
      let total = 0;
      cartBody.innerHTML = "";

      if (!cart || cart.length === 0) {
        cartBody.innerHTML = '<tr><td colspan="5">Your cart is empty</td></tr>';
      } else {
        cart.forEach((item, index) => {
          const qty = Number.parseFloat(item.qty) || 1;
          const price = Number.parseFloat(item.price) || 0;
          const subtotal = price * qty;
          total += subtotal;

          console.log(`Item ${index}:`, item, `qty: ${qty}, unit: ${unit}, subtotal: ${subtotal}`);

          const row = document.createElement('tr');

          row.innerHTML = `
            <td>${item.name}</td>
            <td>Ksh ${Math.round(price).toLocaleString()}</td>
            <td>${qty}</td>
            <td>Ksh ${Math.round(subtotal).toLocaleString()}</td>
            <td><button class="remove-btn" data-index="${index}" aria-label="Remove ${item.name}">Remove</button></td>
          `;

          cartBody.appendChild(row);
        });
      }

      if (grandTotalEl) grandTotalEl.textContent = Math.round(total || 0).toLocaleString();
    }

    // initial render
    renderCart();

    // Event delegation for remove buttons
    cartBody.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.remove-btn');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= cart.length) return;

      // Remove item
      const removed = cart.splice(idx, 1)[0];
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      renderCart();
      alert(`${removed.name} removed from cart.`);
    });

    } catch (err) {
      console.error('Error rendering cart:', err);
      cartBody.innerHTML = '<tr><td colspan="5" style="color:crimson">Unable to load cart. Check console for details.</td></tr>';
    }
  }

// ================== USER AUTH DISPLAY ==================
document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('user');
  console.log("Checking user auth...", userStr); // Debug log
  
  // Find the login link (robust selector)
  const loginLink = document.querySelector('a[href*="login.html"]') || 
                    document.querySelector('.btn-login');

  if (!loginLink) console.log("Login link not found in navbar"); // Debug log

  if (userStr && loginLink) {
    try {
      const user = JSON.parse(userStr);
      
      // 1. Replace "Login" text with Username
      loginLink.innerHTML = `👤 ${user.username}`;
      loginLink.href = "profile.html"; 
      loginLink.style.cursor = "pointer";
      console.log("User logged in, updating nav"); // Debug log
      
      // 2. Create Logout Link
      const logoutLink = document.createElement('a');
      logoutLink.textContent = "Logout";
      logoutLink.href = "#";
      logoutLink.style.marginLeft = "15px";
      logoutLink.style.color = "#ff4d4f";
      logoutLink.style.fontWeight = "bold";

      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
      });

      // 3. Insert Logout link after the username
       // Find the nav element to append the logout link
      const nav = document.querySelector('nav');

      if (nav) {
        nav.appendChild(logoutLink);
      }

    } catch (e) {
      console.error("Error parsing user data", e);
      localStorage.removeItem('user');
    }
  }
});