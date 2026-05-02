document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  if (!form) return; // prevent crash if form not present

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = {
      username: document.getElementById('username').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      password: document.getElementById('password').value
    };

    // Basic validation
    if (!user.username || !user.email || !user.phone || !user.password) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Registration failed');
        return;
      }

      alert('✅ Registration successful!');
      form.reset();
      window.location.href = '/login.html'; // redirect to login page

    } catch (err) {
      console.error('Registration error:', err);
      alert('❌ Server error. Try again later.');
    }
  });
});
