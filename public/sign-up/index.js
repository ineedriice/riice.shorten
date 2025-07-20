let token = '';

document.getElementById('registerBtn').addEventListener('click', register);
document.getElementById('loginBtn').addEventListener('click', login);

function showMessage(msg, success = false) {
  const result = document.getElementById('result');
  result.textContent = msg;
  result.className = `text-sm mt-1 text-center ${success ? 'text-green-400' : 'text-red-400'}`;

  clearTimeout(result._clearTimeout);
  result._clearTimeout = setTimeout(() => {
    result.textContent = '';
  }, 2000);
}

async function register() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    return showMessage('Please fill in both username and password.');
  }

  if (password.length < 4) {
    return showMessage('Password must be at least 4 characters.');
  }

  const res = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (res.status === 409) {
    return showMessage('Username already exists. Try another.');
  }

  if (res.ok) {
    showMessage('Registered! Please login now.', true);
  } else {
    showMessage(data.msg || 'Registration failed.');
  }
}

async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    return showMessage('Please enter both username and password.');
  }

  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (res.ok && data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', username);
    showMessage('Logged in!', true);
    setTimeout(() => window.location.href = '/', 1000);
  } else {
    showMessage(data.msg || 'Login failed.');
  }
}