document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const API_URL = window.location.origin.includes('5000') ? '' : 'https://gracious-poultry-onlineshop.onrender.com';

  try {
    // Hapa ndipo tunatumia POST method
    const res = await fetch(`${API_URL}/api/admin/register`, {
      method: 'POST', // 👈 Hii ndio siri ya kutuma data
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      alert('✅ Admin Registered Successfully!');
      window.location.href = '/admin-login'; // Peleka kwenye login
    } else {
      alert('❌ Failed: ' + (data.message || 'Unknown error'));
    }

  } catch (err) {
    console.error(err);
    alert('Server error');
  }
});