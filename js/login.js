document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorMessage) errorMessage.textContent = '';

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Determine if we need to use the full URL or relative path
            const API_URL = window.location.origin.includes('5000') ? '' : 'http://localhost:5000';

            try {
                const response = await fetch(`${API_URL}/api/admin/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token); // ✅ Save token for orders.js
                    window.location.href = '/dashboard.html';
                } else {
                    if (errorMessage) errorMessage.textContent = data.message || 'Invalid email or password';
                }
            } catch (error) {
                console.error('Login error:', error);
                if (errorMessage) errorMessage.textContent = 'An error occurred. Please try again.';
            }
        });
    }
});