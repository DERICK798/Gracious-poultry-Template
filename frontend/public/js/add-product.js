// ================== AUTH TOKEN ==================
const token = localStorage.getItem('token');

if (!token || token === 'undefined') {
  alert('Please login as admin');
  window.location.href = '/admin-login.html';
}

let currentPage = 1;
let allProducts = []; // Local cache to make editing easier

// Helper function to escape HTML and prevent XSS
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const p = document.createElement("p");
  p.textContent = str;
  return p.innerHTML;
}

// Helper to normalize image paths and prevent broken URLs
const getImgPath = (img) => {
  if (!img) return '';
  if (img.startsWith('http') || img.startsWith('data:')) return img;
  const cleanPath = img.startsWith('uploads/') ? img : 'uploads/' + img;
  return `${API_URL}/${cleanPath}`;
};

// ================== ADD PRODUCT ==================
if (typeof document !== 'undefined') {
  const form = document.getElementById('addProductForm');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Use FormData to support binary file uploads
      const formData = new FormData();
      formData.append('name', document.getElementById("name").value.trim());
      formData.append('category', document.getElementById("category").value.trim());
      formData.append('price', document.getElementById("price").value);
      formData.append('description', document.getElementById("description").value.trim());
      formData.append('quantity', document.getElementById("quantity")?.value || 0);

      // Append files if selected
      const imageFile = document.getElementById("image").files[0];
      const image2File = document.getElementById("image2").files[0];
      
      if (imageFile) formData.append('image', imageFile);
      if (image2File) formData.append('image2', image2File);

      try {
        const baseUrl = typeof API_URL !== 'undefined' ? API_URL : '';
        const res = await fetch(`${baseUrl}/api/products`, {
          method: 'POST',
          headers: {
            // NOTE: Do NOT set 'Content-Type' header when sending FormData. 
            // The browser will automatically set it to multipart/form-data with the correct boundary.
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const data = await res.json();

        if (res.ok) {
          alert('✅ Product added successfully');
          form.reset();
          loadProducts(); // refresh admin list
        } else {
          alert(data.message || '❌ Failed to add product');
        }
      } catch (err) {
        console.error(err);
        alert('❌ Server error');
      }
    });
  }
}

// ================== PAGINATION RENDER ==================
function renderProductPagination(page, totalPages) {
  const pagination = document.getElementById("products-pagination");
  if (!pagination) return;
  pagination.innerHTML = "";

  // Ensure at least 1 page is recognized
  if (!totalPages) totalPages = 1;

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Prev";
  prevBtn.disabled = page === 1;
  prevBtn.onclick = () => loadProducts(page - 1);
  pagination.appendChild(prevBtn);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = page === i ? "active" : "";
    btn.onclick = () => loadProducts(i);
    pagination.appendChild(btn);
  }

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.disabled = page === totalPages;
  nextBtn.onclick = () => loadProducts(page + 1);
  pagination.appendChild(nextBtn);
}

// ================== LOAD PRODUCTS ==================
async function loadProducts(page = 1) {
  currentPage = page;
  try {
    const baseUrl = typeof API_URL !== 'undefined' ? API_URL : '';
    const res = await fetch(`${baseUrl}/api/products?page=${page}&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      // Handle expired or invalid token
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/admin-login.html';
        return;
      }

      const errorData = await res.json();
      throw new Error(errorData.message || 'Fetch failed');
    }

    const result = await res.json();
    // Handle both paginated { data: [...] } and flat [...] responses
    allProducts = result.data || (Array.isArray(result) ? result : []);
    const totalPages = result.totalPages || 0;
    const currentPageNum = result.page || 1;
    const tbody = document.querySelector('#products-table tbody');

    if (!tbody) return;
    tbody.innerHTML = '';

    if (!allProducts || allProducts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No products found</td></tr>';
      return;
    }

    allProducts.forEach(p => {
      const row = document.createElement('tr');
      const placeholder = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2250%22%20height%3D%2250%22%20viewBox%3D%220%200%2050%2050%22%3E%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-size%3D%2210%22%20fill%3D%22%23aaa%22%3ENo%20Img%3C%2Ftext%3E%3C%2Fsvg%3E';
      
      const imageUrl = getImgPath(p.image) || placeholder;
      const image2Url = getImgPath(p.image2) || placeholder;

      row.innerHTML = `
        <td><strong>${escapeHTML(p.name)}</strong></td>
        <td>KES ${p.price != null && p.price !== '' ? escapeHTML(String(p.price)) : '0'}</td>
        <td>${escapeHTML(p.category)}</td>
        <td>${p.quantity != null && p.quantity !== '' ? escapeHTML(String(p.quantity)) : '0'}</td>
        <td>
          <img src="${imageUrl}" alt="${escapeHTML(p.name)}" 
               style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" 
               onerror="this.onerror=null;this.src='${placeholder}';">
        </td>
        <td>
          <img src="${image2Url}" alt="${escapeHTML(p.name)} 2" 
               style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" 
               onerror="this.onerror=null;this.src='${placeholder}';">
        </td>
        <td style="white-space: nowrap;">
          <button onclick="updateProduct(${p.id})" style="padding: 8px 12px; margin-bottom: 4px;">Edit</button>
          <button onclick="deleteProduct(${p.id})" style="padding: 8px 12px; background: #dc3545; color: white;">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Render pagination
    renderProductPagination(currentPageNum, totalPages);

  } catch (err) {
    console.error(err);
    const tbody = document.querySelector('#products-table tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Failed to load products: ${err.message}</td></tr>`;
  }
}

// ================== DELETE PRODUCT ==================
async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;

  try {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (res.ok) {
      alert(data.message || '🗑️ Product deleted');
      loadProducts(currentPage);
    } else {
      alert(data.message || `❌ Delete failed (${res.status})`);
    }

  } catch (err) {
    console.error(err);
    alert('❌ Server error');
  }
}

// ================== UPDATE PRODUCT ==================
async function updateProduct(id) {
  const p = allProducts.find(item => item.id === id);
  if (!p) {
    alert('Product not found in current list. Please refresh.');
    return;
  }

  // Mobile users: Pre-filling the prompts makes it much easier to edit just one field
  const name = prompt('Update name:', p.name && p.name !== 'null' ? p.name : '');
  if (name === null) return; // User cancelled the process

  const priceInput = prompt('Update price:', p.price != null && p.price !== 'null' ? p.price : '');
  const category = prompt('Update category:', p.category && p.category !== 'null' ? p.category : '');
  const quantityInput = prompt('Update quantity:', p.quantity != null && p.quantity !== 'null' ? p.quantity : '');
  const image = prompt('Update image path:', p.image && p.image !== 'null' ? p.image : '');
  const image2 = prompt('Update image2 path:', p.image2 && p.image2 !== 'null' ? p.image2 : '');
  const description = prompt('Update description:', p.description && p.description !== 'null' ? p.description : '');

  const price = parseFloat(priceInput);
  const quantity = parseInt(quantityInput);

  if (!name || isNaN(price) || !category || isNaN(quantity)) {
    return alert('Invalid input. Name, Price, Category, and Quantity are required.');
  }

  try {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, price, category, image, image2, description, quantity })
    });

    const data = await res.json();

    if (res.ok) {
      alert('✏️ Product updated');
      loadProducts(currentPage);
    } else {
      alert(data.message || 'Update failed');
    }
  } catch (err) {
    console.error(err);
    alert('Server error');
  }
}

// ================== INIT ==================
window.addEventListener('DOMContentLoaded', () => {
  loadProducts();
});
