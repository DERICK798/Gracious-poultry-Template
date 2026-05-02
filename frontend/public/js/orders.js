// ================== AUTH TOKEN ==================
const orderToken = localStorage.getItem('token');

if (!orderToken || orderToken === 'undefined') {
  alert('Please login as admin');
  window.location.href = '/admin-login';
}
// ================== PAGINATION RENDER ==================
function renderPagination(page, totalPages) {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;
  pagination.innerHTML = "";

  // Ensure at least 1 page is recognized
  if (!totalPages) totalPages = 1;

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Prev";
  prevBtn.disabled = page === 1;
  prevBtn.onclick = () => loadOrders(page - 1);
  pagination.appendChild(prevBtn);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = page === i ? "active" : "";
    btn.onclick = () => loadOrders(i);
    pagination.appendChild(btn);
  }

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.disabled = page === totalPages;
  nextBtn.onclick = () => loadOrders(page + 1);
  pagination.appendChild(nextBtn);
}

// Helper function to escape HTML and prevent XSS
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const p = document.createElement("p");
  p.textContent = str;
  return p.innerHTML;
}


// ================== LOAD ORDERS ==================
let currentOrderPage = 1;
let currentSearchQuery = "";
const limit = 10;

async function loadOrders(page = 1, searchQuery = null) {
  currentOrderPage = page;

  if (searchQuery !== null) {
    currentSearchQuery = searchQuery;
  }
console.log("ORDER TOKEN:", orderToken);

  try {
    const res = await fetch(`/api/orders?page=${page}&limit=${limit}&search=${encodeURIComponent(currentSearchQuery)}`, {
      headers: {
        Authorization: `Bearer ${orderToken}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        alert('Session expired or unauthorized. Please login again.');
        localStorage.removeItem('token');
        window.location.href = '/admin-login.html';
        return;
      }
      const errText = await res.text();
      throw new Error(`Fetch failed: ${res.status} ${errText}`);
    }

    const result = await res.json();
    console.log("ORDERS RESPONSE 👉", result);

    const orders = result.data || (Array.isArray(result) ? result : []);
    const tbody = document.querySelector("#orders-table tbody");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;">No orders found</td>
        </tr>
      `;
      return;
    }

    orders.forEach(o => {
      const row = document.createElement("tr");

      // Status Buttons Logic
      let actionButtons = '';
      if (o.status === 'Pending' || o.status === 'Paid' || o.status === 'Cancelled') {
        actionButtons = `
          <button onclick="updateOrderStatus(${o.id}, 'Delivered')" style="background:green; color:white; margin-right:5px; cursor:pointer;">${o.status === 'Paid' ? 'Mark Delivered' : 'Deliver'}</button>
          ${o.status !== 'Cancelled' ? `<button onclick="updateOrderStatus(${o.id}, 'Cancelled')" style="background:orange; color:white; margin-right:5px; cursor:pointer;">Cancel</button>` : ''}
        `;
      }

      row.innerHTML = `
        <td>${escapeHTML(o.id)}</td>
        <td>${escapeHTML(o.phone)}</td>
        <td>
            <div><strong>Loc:</strong> ${escapeHTML(o.location || "-")}</div>
            <div style="font-size:0.8em; color:#666;">ID: ${escapeHTML(o.checkout_id || "N/A")}</div>
        </td>
        <td>${escapeHTML(o.payment_method)}</td>
        <td style="font-weight:bold; color:${o.status === 'Pending' ? 'orange' : (o.status === 'Paid' ? '#007bff' : (o.status === 'Delivered' ? 'green' : 'red'))}">
            ${escapeHTML(o.status)}
            <div style="font-size:0.8em; font-weight:normal; color:#555;">${escapeHTML(o.mpesa_receipt || "")}</div>
        </td>
        <td>
            KES ${o.total}
            <div style="font-size:0.75em; color:gray; max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${escapeHTML(o.result_desc)}">${escapeHTML(o.result_desc || "")}</div>
        </td>
        <td>${o.created_at ? new Date(o.created_at).toLocaleString() : 'N/A'}</td>
        <td>
          <button onclick="viewOrderItems(${o.id})" style="background:#17a2b8; color:white; margin-right:5px; cursor:pointer;">View Items</button>
          ${actionButtons}
          <button onclick="deleteOrder(${o.id})" style="background:red; color:white; cursor:pointer;">Delete</button>
        </td>
      `;

      tbody.appendChild(row);
    });

    // render pagination buttons
    renderPagination(result.page, result.totalPages);

  } catch (err) {
    console.error(err);
    const tbody = document.querySelector("#orders-table tbody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; color: red;">Failed to load orders: ${err.message}</td>
        </tr>
      `;
    }
  }
}

// ================== VIEW ITEMS ==================
async function viewOrderItems(id) {
  try {
    const res = await fetch(`/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${orderToken}` }
    });
    const order = await res.json();

    if (!res.ok) return alert(order.message || 'Failed to load items');

    const itemsList = (order.items && order.items.length > 0) 
      ? order.items.map(i => `- ${i.product_name} (Qty: ${i.quantity}) @ ${i.price}`).join('\n')
      : "No items found for this order.";

    alert(`📦 Order #${order.id} Items:\n\n${itemsList}\n\n💰 Total: ${order.total}`);

  } catch (err) {
    console.error(err);
    alert('Server error');
  }
}

// ================== UPDATE STATUS ==================
async function updateOrderStatus(id, status) {
  if (!confirm(`Mark order #${id} as ${status}?`)) return;

  try {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${orderToken}` 
      },
      body: JSON.stringify({ status })
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.message);
      loadOrders(currentOrderPage); // Refresh table
    } else {
      alert(data.message || 'Update failed');
    }

  } catch (err) {
    console.error(err);
    alert('Server error');
  }
}

// ================== DELETE ORDER ==================
async function deleteOrder(id) {
  if (!confirm('Delete this order?')) return;

  try {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${orderToken}` }
    });

    let data = {};
    try { data = await res.json(); } catch {}

    if (res.ok) {
      alert(data.message || '🗑️ Order deleted');
      loadOrders(currentOrderPage);
    } else {
      alert(data.message || `❌ Delete failed (${res.status})`);
    }

  } catch (err) {
    console.error(err);
    alert('❌ Server error');
  }
}

// ================== INIT ==================
window.addEventListener('DOMContentLoaded', () => {
  loadOrders();

  const searchInput = document.getElementById('order-search');
  const clearBtn = document.getElementById('clear-search');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => loadOrders(1, e.target.value));
  }

  if (clearBtn && searchInput) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      loadOrders(1, '');
    });
  }
});
