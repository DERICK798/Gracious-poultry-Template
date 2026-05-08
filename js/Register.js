// public/js/Register.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1️⃣ Get form values
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;

    // 2️⃣ Basic frontend validation
    if (!username || !email || !phone || !password) {
      alert('Please fill all fields');
      return;
    }

    // 3️⃣ Prepare payload
    const user = { username, email, phone, password };

    try {
      // 4️⃣ Send POST request to backend
      const res = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      const data = await res.json();

      // 5️⃣ Handle response
      if (!res.ok) {
        alert(data.message || 'Registration failed');
        return;
      }

      alert(data.message);
      form.reset(); // clear the form
      window.location.href = '/login.html'; // redirect to our route

    } catch (err) {
      console.error('REGISTER FETCH ERROR:', err);
      alert('Server error. Try again later.');
    }
  });
});
