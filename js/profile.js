// Helper function to render pagination controls
function renderOrdersPagination(page, totalPages, loadOrdersFn) {
  const paginationContainer = document.getElementById('orders-pagination');
  if (!paginationContainer) {
   
    return;
  }

  paginationContainer.innerHTML = '';
  if (totalPages <= 1) return;

  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Prev';
  prevBtn.disabled = page === 1;
  prevBtn.onclick = () => loadOrdersFn(page - 1);
  paginationContainer.appendChild(prevBtn);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = page === i ? 'active' : '';
    btn.onclick = () => loadOrdersFn(i);
    paginationContainer.appendChild(btn);
  }

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.disabled = page === totalPages;
  nextBtn.onclick = () => loadOrdersFn(page + 1);
  paginationContainer.appendChild(nextBtn);
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    alert('Please login to view your profile');
    window.location.href = 'login.html';
    return;
  }

  const user = JSON.parse(userStr);
  
  // --- PROFILE PICTURE LOGIC ---
  const profileImg = document.getElementById('profile-img');
  const uploadBtn = document.getElementById('upload-btn');
  const fileInput = document.getElementById('profile-upload');

  // 1. Load existing image if available
  if (user.profile_picture) {
    // Handle broken image links (e.g. if placeholder site is down)
    profileImg.onerror = function() {
        this.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%22150%22%20viewBox%3D%220%200%20150%20150%22%3E%3Crect%20width%3D%22150%22%20height%3D%22150%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-size%3D%2220%22%20fill%3D%22%23aaa%22%3EUser%3C%2Ftext%3E%3C%2Fsvg%3E';
    };
    profileImg.src = user.profile_picture.startsWith('http') ? user.profile_picture : `${API_URL}${user.profile_picture}`;
  }

  // 2. Trigger file input on button click
  uploadBtn.addEventListener('click', () => fileInput.click());

  // 3. Handle file upload
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`${API_URL}/api/users/upload-avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      const fullImageUrl = `${API_URL}${data.imageUrl}`;
      profileImg.src = fullImageUrl;
      user.profile_picture = data.imageUrl;
      localStorage.setItem('user', JSON.stringify(user));
      alert('Profile picture updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to upload. Ensure backend route exists.');
    }
  });

  // Render User Info
  const userInfoDiv = document.getElementById('user-info');
  userInfoDiv.innerHTML = `
    <p><strong>Name:</strong> ${user.username}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>Phone:</strong> ${user.phone}</p>
  `;

  // --- Orders with Pagination ---
  const loadOrders = async (page = 1) => {
    const limit = 5; // You can adjust this limit
    try {
      const res = await fetch(`${API_URL}/api/orders/my-orders?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        // Handle 401 (Unauthorized) and 404 (User not found)
        if (res.status === 401 || res.status === 404) {
          console.warn('Session invalid or user not found. Logging out.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          alert('Session expired or user not found. Please login again.');
          window.location.href = 'login.html';
          return;
        }
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch orders');
      }

      const result = await res.json();
      const orders = Array.isArray(result.data) ? result.data : [];
      const tbody = document.getElementById('orders-list');
      tbody.innerHTML = '';

      if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No orders found.</td></tr>';
        renderOrdersPagination(0, 0, loadOrders); // Clear pagination
        return;
      }

      tbody.innerHTML = orders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        const status = order.status || 'Pending';
        const statusClass = `status-${status.toLowerCase()}`;
        const total = Number(order.total).toLocaleString();
        return `
          <tr>
            <td>#${order.id}</td>
            <td>${date}</td>
            <td>KES ${total}</td>
            <td class="${statusClass}">${status}</td>
          </tr>
        `;
      }).join('');

      renderOrdersPagination(result.page, result.totalPages, loadOrders);
    } catch (err) {
      console.error(err);
      document.getElementById('orders-list').innerHTML = '<tr><td colspan="4" style="color:red">Error loading orders</td></tr>';
    }
  };

  // Initial load of orders
  loadOrders(1);
});