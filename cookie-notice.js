(() => {
  const key = 'doomwatch-cookie-notice.v1';
  try { if (localStorage.getItem(key) === 'seen') return; } catch {}
  const notice = document.createElement('aside');
  notice.className = 'cookie-notice';
  notice.setAttribute('aria-label', 'Browser storage notice');
  notice.innerHTML = '<div><strong>Your progress stays here</strong><p>Your profile, watch progress, and preferences are saved in this browser.</p></div><button type="button">Got it</button>';
  notice.querySelector('button').addEventListener('click', () => {
    try { localStorage.setItem(key, 'seen'); } catch {}
    notice.remove();
  });
  document.body.append(notice);
})();
