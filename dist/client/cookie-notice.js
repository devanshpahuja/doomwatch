(() => {
  const key = 'doomwatch-cookie-notice.v1';
  try { if (localStorage.getItem(key) === 'seen') return; } catch {}
  const notice = document.createElement('aside');
  notice.className = 'cookie-notice';
  notice.setAttribute('aria-label', 'Cookie notice');
  notice.innerHTML = '<div><strong>We use cookies</strong><p>A cookie lets you sign the wall once per browser. Your profile and watch progress are saved in this browser. <a href="/privacy.html">Privacy Policy</a></p></div><button type="button">Got it</button>';
  notice.querySelector('button').addEventListener('click', () => {
    try { localStorage.setItem(key, 'seen'); } catch {}
    notice.remove();
  });
  document.body.append(notice);
})();
