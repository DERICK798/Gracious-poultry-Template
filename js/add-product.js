// ================== AUTH TOKEN ==================
const token = localStorage.getItem('token');

if (!token) {
  alert('Please login as admin');
  window.location.href = '/admin-login.html';
}

let currentPage = 1;
let allProducts = []; // Local cache to enable autofill during editing

// Helper function to escape HTML and prevent XSS
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const p = document.createElement("p");
  p.textContent = str;
  return p.innerHTML;
}

// Helper to normalize image paths
const getImgPath = (img) => {
  if (!img) return '';
  if (img.startsWith('http') || img.startsWith('data:')) return img;
  const baseUrl = typeof API_URL !== 'undefined' ? API_URL : '';
  const filename = img.replace(/^\/?(uploads\/)?/, ''); 
  return `${baseUrl}/uploads/${filename}`;
};

// ================== ADD PRODUCT ==================
if (typeof document !== 'undefined') {
  const form = document.getElementById('addProductForm');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Use FormData to support binary file uploads (essential for mobile/web file pickers)
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
        const res = await fetch(`${API_URL}/api/products`, {
          method: 'POST',
          headers: {
            // NOTE: Browser automatically sets multipart/form-data boundary when body is FormData
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
    const res = await fetch(`${API_URL}/api/products?page=${page}&limit=10`, {
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
        <td>KES ${p.price != null ? escapeHTML(String(p.price)) : '0'}</td>
        <td>${escapeHTML(p.category)}</td>
        <td>${p.quantity != null ? escapeHTML(String(p.quantity)) : '0'}</td>
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

  // Autofill existing values into prompts for easier editing
  let name = prompt('Update name:', p.name || '');
  if (name === null) return; // User cancelled the edit

  let priceInput = prompt('Update price:', p.price != null ? p.price : '0');
  let category = prompt('Update category:', p.category || '');
  let quantityInput = prompt('Update quantity:', p.quantity != null ? p.quantity : '0');
  
  // Safeguard: If the prompt is cancelled or left blank, we keep the existing image filename
  let image = prompt('Update image path/filename:', p.image || '');
  if (image === null || image.trim() === '') image = p.image;

  let image2 = prompt('Update image2 path/filename:', p.image2 || '');
  if (image2 === null || image2.trim() === '') image2 = p.image2;

  let description = prompt('Update description:', p.description || '');

  const price = parseFloat(priceInput) || 0;
  const quantity = parseInt(quantityInput) || 0;

  if (!name || isNaN(price) || !category || isNaN(quantity)) {
    alert('Invalid input');
    return;
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
