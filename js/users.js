// ================== AUTH TOKEN ==================
const usersToken = localStorage.getItem('token');

if (!usersToken || usersToken === 'undefined') {
  console.error('Admin token not found. Users cannot be loaded.');
}

// ================== PAGINATION RENDER ==================
function renderUserPagination(page, totalPages) {
  const pagination = document.getElementById("users-pagination");
  if (!pagination) return;
  pagination.innerHTML = "";

  // Ensure at least 1 page is recognized
  if (!totalPages) totalPages = 1;

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Prev";
  prevBtn.disabled = page === 1;
  prevBtn.onclick = () => loadUsers(page - 1);
  pagination.appendChild(prevBtn);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = page === i ? "active" : "";
    btn.onclick = () => loadUsers(i);
    pagination.appendChild(btn);
  }

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.disabled = page === totalPages;
  nextBtn.onclick = () => loadUsers(page + 1);
  pagination.appendChild(nextBtn);
}

// ================== LOAD USERS ==================
async function loadUsers(page = 1) {
  if (!usersToken || usersToken === 'undefined') return;

  try {
    const res = await fetch(`${API_URL}/api/users?page=${page}&limit=10`, {
      headers: {
        Authorization: `Bearer ${usersToken}`,
      },
    });

    if (!res.ok) {
      // Handle expired or invalid token
      if (res.status === 401 || res.status === 403) {
        console.warn('Admin session expired.');
        localStorage.removeItem('token');
        window.location.href = '/admin-login.html';
        return;
      }

      const errText = await res.text();
      throw new Error(`Fetch failed: ${res.status} ${errText}`);
    }

    const result = await res.json();
    // Handle both paginated { data: [...] } and flat [...] responses
    const users = result.data || (Array.isArray(result) ? result : []);
    const totalPages = result.totalPages || 0;
    const currentPage = result.page || 1;
    const tbody = document.querySelector("#users-table tbody");

    if (!tbody) return;
    tbody.innerHTML = "";

    if (!users || users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;">No users found</td>
        </tr>
      `;
      return;
    }

    users.forEach(user => {
      const row = document.createElement("tr");
      const avatarUrl = user.profile_picture ? `${API_URL}${user.profile_picture}` : 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2250%22%20height%3D%2250%22%20viewBox%3D%220%200%2050%2050%22%3E%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-size%3D%2212%22%20fill%3D%22%23aaa%22%3EUser%3C%2Ftext%3E%3C%2Fsvg%3E';
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${new Date(user.created_at).toLocaleDateString()}</td>
        <td><img src="${avatarUrl}" class="user-avatar" alt="Profile" onerror="this.onerror=null;this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2250%22%20height%3D%2250%22%20viewBox%3D%220%200%2050%2050%22%3E%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-size%3D%2212%22%20fill%3D%22%23aaa%22%3EUser%3C%2Ftext%3E%3C%2Fsvg%3E'"></td>
      `;
      tbody.appendChild(row);
    });

    // Render pagination
    renderUserPagination(currentPage, totalPages);

  } catch (err) {
    console.error('Failed to load users:', err);
    const tbody = document.querySelector("#users-table tbody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; color: red;">Failed to load users.</td>
        </tr>
      `;
    }
  }
}

// ================== INIT ==================
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('users-table')) {
    loadUsers();
  }
});
