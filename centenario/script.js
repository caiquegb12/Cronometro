(() => {
  'use strict';
  const root = document.querySelector('.mc100-page');
  if (!root) return;
  // Meia-noite em Belo Horizonte: independe do fuso do aparelho do visitante.
  const target = Date.parse('2029-09-07T00:00:00-03:00');
  function updateCountdown() {
    const remaining = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const values = { days: Math.floor(remaining / 86400), hours: Math.floor(remaining % 86400 / 3600), minutes: Math.floor(remaining % 3600 / 60), seconds: remaining % 60 };
    Object.entries(values).forEach(([unit, value]) => root.querySelectorAll(`[data-unit="${unit}"]`).forEach(el => { el.textContent = String(value).padStart(2, '0'); }));
    root.querySelector('#celebration').hidden = remaining > 0;
    if (!remaining) {
      root.querySelector('#timer-title').textContent = 'Chegamos aos 100 anos!';
      const floatingTitle = root.querySelector('.floating-title');
      if (floatingTitle) floatingTitle.textContent = 'Chegamos aos 100 anos!';
    }
  }
  updateCountdown();
  const timer = setInterval(updateCountdown, 1000);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });

  const floating = root.querySelector('.floating-countdown');
  const banner = root.querySelector('.countdown-wrap');
  if (floating && banner) {
    let dismissed = false;
    const updateFloating = () => { floating.hidden = dismissed || banner.getBoundingClientRect().bottom > 0; };
    root.querySelector('.floating-close').addEventListener('click', () => { dismissed = true; floating.hidden = true; });
    if ('IntersectionObserver' in window) {
      const observer = new window.IntersectionObserver(updateFloating, { threshold: 0 });
      observer.observe(banner);
    } else {
      window.addEventListener('scroll', updateFloating, { passive: true });
    }
    window.addEventListener('resize', updateFloating, { passive: true });
    updateFloating();
  }

  const toggle = root.querySelector('.menu-toggle');
  const menu = root.querySelector('#centenario-menu');
  function closeMenu() { toggle.setAttribute('aria-expanded', 'false'); menu.classList.remove('is-open'); }
  toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); menu.classList.toggle('is-open', open); });
  menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); } });

  const content = window.MC100_CONTENT || {};
  const make = (tag, text, className) => { const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el; };
  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try { const url = new URL(value, document.baseURI); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
  }
  function render(key, listId, emptyId, build) {
    const items = Array.isArray(content[key]) ? content[key] : [];
    const list = root.querySelector(listId);
    items.filter(item => item && typeof item === 'object' && typeof item.titulo === 'string' && item.titulo.trim()).forEach(item => { const node = build(item); if (node) list.append(node); });
    root.querySelector(emptyId).hidden = list.childElementCount > 0;
    if (key === 'agenda' && list.childElementCount) root.querySelector('.status').textContent = 'Programação do centenário';
  }
  function link(parent, value, label) { const url = safeUrl(value); if (url) { const a = make('a', label, 'text-link'); a.href = url; parent.append(a); } }
  const inviteDialog = make('dialog', '', 'invite-dialog');
  inviteDialog.setAttribute('aria-label', 'Convite do evento');
  const closeInvite = make('button', 'Fechar ×', 'invite-close');
  closeInvite.type = 'button';
  const inviteImage = make('img');
  inviteDialog.append(closeInvite, inviteImage); root.append(inviteDialog);
  closeInvite.addEventListener('click', () => inviteDialog.close());
  inviteDialog.addEventListener('click', event => { if (event.target === inviteDialog) inviteDialog.close(); });
  render('agenda', '#agenda-list', '#agenda-empty', item => {
    const article = make('article', '', 'agenda-item');
    const date = new Date(item.data);
    if (!Number.isFinite(date.getTime()) || !/T.*(Z|[+-]\d{2}:\d{2})$/.test(item.data)) return null;
    const time = make('time', '', 'agenda-date');
    time.append(make('span', new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(date)), make('strong', item.horario || new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(date)));
    time.dateTime = date.toISOString(); article.append(time);
    const copy = make('div', '', 'agenda-copy'); copy.append(make('h3', item.titulo));
    if (item.local) copy.append(make('p', item.local, 'agenda-location'));
    if (item.descricao) copy.append(make('p', item.descricao));
    link(copy, item.url, 'Ver detalhes ↗'); article.append(copy);
    const imageUrl = safeUrl(item.imagem);
    if (imageUrl) {
      const button = make('button', '', 'agenda-invite'); button.type = 'button';
      button.setAttribute('aria-label', `Ampliar convite: ${item.titulo}`);
      const image = make('img'); image.src = imageUrl; image.alt = item.imagemAlt || `Convite: ${item.titulo}`; image.loading = 'lazy';
      button.append(image, make('span', 'Ampliar convite ↗'));
      image.addEventListener('error', () => { button.remove(); article.classList.remove('has-invite'); }, { once: true });
      button.addEventListener('click', () => { inviteImage.src = imageUrl; inviteImage.alt = image.alt; inviteDialog.showModal(); });
      article.classList.add('has-invite'); article.append(button);
    }
    return article;
  });
  render('novidades', '#news-list', '#news-empty', item => {
    const article = make('article', '', 'news-item'); article.append(make('h3', item.titulo)); if (item.resumo) article.append(make('p', item.resumo)); link(article, item.url, 'Ler publicação ↗'); return article;
  });
  render('patrocinadores', '#partners-list', '#partners-empty', item => {
    const article = make('article', '', 'partner'); const logo = safeUrl(item.logo);
    if (logo) { const img = make('img'); img.src = logo; img.alt = item.titulo; img.loading = 'lazy'; img.addEventListener('error', () => { img.remove(); article.prepend(make('strong', item.titulo)); }, { once: true }); article.append(img); }
    else article.append(make('strong', item.titulo));
    article.append(make('p', item.categoria || 'Patrocinador')); link(article, item.url, `Conheça ${item.titulo} ↗`); return article;
  });
  if (new URLSearchParams(location.search).get('integrado') === '1') root.classList.add('is-integrated');
})();
