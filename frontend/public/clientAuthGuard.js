const user = localStorage.getItem('user');

if (!user) {
  alert('Please login to access this page');
  window.location.href = 'login.html';
}
