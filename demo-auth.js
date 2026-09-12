(() => {
  const authScreen = document.getElementById('authScreen');
  const loginForm = document.getElementById('demoLoginForm');
  const signupForm = document.getElementById('demoSignupForm');
  const message = document.getElementById('demoAuthMessage');

  function setView(view) {
    const signup = view === 'signup';
    loginForm.classList.toggle('hidden', signup);
    signupForm.classList.toggle('hidden', !signup);
    document.querySelectorAll('[data-demo-view]').forEach((button) => button.classList.toggle('active', button.dataset.demoView === view));
    message.className = 'auth-message hidden';
  }

  function enterDemo(name) {
    sessionStorage.setItem('tipscart_demo_user', name || 'Demo User');
    document.body.classList.add('auth-ready');
    const profile = document.querySelector('.profile');
    if (profile) profile.innerHTML = `${name || 'Demo User'} <span class="caret">▾</span>`;
  }

  async function triggerDemoLogin(email) {
    const backend = window.location.port === '8000' || window.location.protocol === 'file:'
      ? 'http://127.0.0.1:8000'
      : ['8001', '8002', '8003'].includes(window.location.port) ? '' : 'http://127.0.0.1:8000';
    try {
      await fetch(backend + '/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'omit',
      });
    } catch (error) {
      // Demo mode can still open locally when the optional backend is offline.
    }
  }

  function showMessage(text) {
    message.textContent = text;
    message.className = 'auth-message error';
  }

  document.querySelectorAll('[data-demo-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.demoView)));
  document.querySelectorAll('.password-toggle').forEach((button) => button.addEventListener('click', () => {
    const input = button.parentElement.querySelector('input');
    input.type = input.type === 'password' ? 'text' : 'password';
    button.textContent = input.type === 'password' ? 'Show' : 'Hide';
  }));
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(loginForm);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    if (!email || !password) { showMessage('Enter your email and any password to continue.'); return; }
    triggerDemoLogin(email).finally(() => enterDemo(email));
  });
  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(signupForm);
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    if (!name || !email || !password) { showMessage('Enter your details and any password to continue.'); return; }
    enterDemo(name);
  });
  window.demoLogout = () => { sessionStorage.removeItem('tipscart_demo_user'); window.location.reload(); };
  document.addEventListener('DOMContentLoaded', () => {
    const user = sessionStorage.getItem('tipscart_demo_user');
    if (user) enterDemo(user);
  });
})();