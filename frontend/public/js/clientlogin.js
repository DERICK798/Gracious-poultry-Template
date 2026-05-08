// public/js/Login.js

document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('login-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1️⃣ Get form values
    const emailOrPhone = document.getElementById('emailOrPhone').value.trim();
    const password = document.getElementById('password').value;

    if (!emailOrPhone || !password) {
      alert('Please fill all fields');
      return;
    }

    const credentials = { emailOrPhone, password };

    try {
      // 2️⃣ Send POST request to login endpoint
      const res = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Login failed');
        return;
      }

      // 3️⃣ Save user info in localStorage (optional)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      alert(data.message);
      window.location.href = 'index.html'; // redirect to our route

    } catch (err) {
      console.error('LOGIN FETCH ERROR:', err);
      alert('Server error. Try again later.');
    }
  });
});
