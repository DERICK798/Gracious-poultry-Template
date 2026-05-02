 document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addProductForm');
    if (!form) {
      console.warn('addProductForm not found on this page');
      return;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const product = {
        name: document.getElementById("name").value.trim(),
        category: document.getElementById("category").value.trim(),
        price: document.getElementById("price").value,
        description: document.getElementById("description").value.trim(),
        image: document.getElementById("image").value.trim(),
        image2: document.getElementById("image2").value.trim(),
        quantity: document.getElementById("quantity")?.value || 0
      
      };

      try {
        const res = await fetch('/api/client/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product)
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || 'Failed to add product');
          return;
        }

        alert('✅ Product added successfully');
        form.reset();

      } catch (err) {
        console.error('Add product error:', err);
        alert('❌ Server error');
    }
  });
});
