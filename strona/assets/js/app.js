/* Interakcje strony. Tresci edytuj w tresci.js, wyglad w style.css. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const data = window.TRESCI || {};
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const read = path => path.split('.').reduce((value, key) => value == null ? undefined : value[key], data);

  // textContent, a nie HTML: wpisany tekst nie jest wykonywany jako kod.
  document.querySelectorAll('[data-text]').forEach(element => {
    const value = read(element.dataset.text);
    if (typeof value === 'string' || typeof value === 'number') element.textContent = String(value);
  });
  document.querySelectorAll('[data-image]').forEach(image => {
    const fallback = image.getAttribute('src');
    image.addEventListener('error', () => {
      if (image.getAttribute('src') !== fallback) {
        image.src = fallback;
        image.alt = 'Miejsce na zdjęcie — sprawdź nazwę pliku w tresci.js.';
      }
    }, {once: true});
    const path = read(image.dataset.image);
    const description = read(image.dataset.alt || '');
    if (typeof path === 'string' && path.trim()) image.src = path.trim();
    if (typeof description === 'string') image.alt = description;
  });
  const name = [data.imie, data.nazwisko].filter(value => typeof value === 'string' && value.trim()).join(' ');
  if (name) document.title = `${document.body.dataset.pageTitle || 'Moja strona'} | ${name}`;
  document.querySelectorAll('[data-year]').forEach(element => { element.textContent = new Date().getFullYear(); });

  // Mobilne menu pozostaje dostepne takze bez JavaScript.
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.site-nav');
  const setMenu = (open, restoreFocus = false) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    menu.classList.toggle('is-open', open);
    if (restoreFocus) toggle.focus();
  };
  if (toggle && menu) {
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    document.addEventListener('click', event => {
      if (toggle.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) setMenu(false);
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', () => setMenu(false));
  }

  // Stopniowe pojawianie sie sekcji. Bez JS lub bez API wszystko jest widoczne.
  if (!motion.matches) document.body.classList.add('motion-ready');
  let observer;
  if (!motion.matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('reveal-pending');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: 0.06, rootMargin: '0px 0px -20px 0px'});
    document.querySelectorAll('[data-reveal]').forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight * 0.94) {
        element.classList.add('reveal-pending');
        observer.observe(element);
      }
    });
  }
  document.addEventListener('focusin', event => {
    const section = event.target.closest('.reveal-pending');
    if (section) section.classList.remove('reveal-pending');
  });
  motion.addEventListener('change', event => {
    if (event.matches) {
      if (observer) observer.disconnect();
      document.querySelectorAll('.reveal-pending').forEach(element => element.classList.remove('reveal-pending'));
      document.body.classList.remove('motion-ready', 'is-leaving');
    }
  });

  // Kontakt: zadnego pozornego formularza. Wiadomosc otwiera sie w programie pocztowym.
  const contact = data.kontakt || {};
  const email = typeof contact.email === 'string' ? contact.email.trim() : '';
  const emailValid = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
  if (emailValid) {
    document.querySelectorAll('[data-email-text]').forEach(element => { element.textContent = email; });
    document.querySelectorAll('[data-email-link]').forEach(link => {
      link.href = `mailto:${email}`;
      link.hidden = false;
    });
    const hint = document.querySelector('[data-email-hint]');
    if (hint) hint.textContent = 'Przycisk otworzy Twoją aplikację pocztową. Możesz też skopiować adres.';
    const copy = document.querySelector('[data-copy-email]');
    if (copy) {
      copy.disabled = false;
      copy.addEventListener('click', async () => {
        const status = document.querySelector('.copy-status');
        try {
          if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(email);
          if (status) status.textContent = 'Adres e-mail został skopiowany.';
        } catch {
          const text = document.querySelector('[data-email-text]');
          const selection = window.getSelection();
          if (text && selection) {
            const range = document.createRange();
            range.selectNodeContents(text);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          if (status) status.textContent = 'Zaznaczyłem adres. Skopiuj go ręcznie: Ctrl+C lub ⌘C.';
        }
      });
    }
  }
  let socialCount = 0;
  document.querySelectorAll('[data-social]').forEach(link => {
    const raw = contact[link.dataset.social];
    if (typeof raw !== 'string' || !raw.trim()) return;
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:') return;
      link.href = url.href;
      link.hidden = false;
      socialCount += 1;
    } catch { /* Niepoprawny lub niepelny adres pozostaje ukryty. */ }
  });
  const socialHint = document.querySelector('[data-social-hint]');
  if (socialHint && socialCount) socialHint.hidden = true;

  // Galeria: natywny dialog pilnuje klawiatury i zamykania klawiszem Escape.
  const lightbox = document.querySelector('.lightbox');
  let lastPhoto;
  document.querySelectorAll('[data-gallery]').forEach(link => {
    const item = Array.isArray(data.galeria) ? data.galeria[Number(link.dataset.gallery)] : null;
    if (item && typeof item.plik === 'string' && item.plik.trim()) link.href = item.plik;
    if (item && typeof item.tytul === 'string') link.setAttribute('aria-label', `Powiększ zdjęcie: ${item.tytul}`);
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (!lightbox || typeof lightbox.showModal !== 'function') return;
      event.preventDefault();
      const source = link.querySelector('img');
      const target = lightbox.querySelector('img');
      target.src = source.currentSrc || source.src;
      target.alt = source.alt;
      lightbox.querySelector('figcaption').textContent = item ? [item.tytul, item.podpis].filter(Boolean).join(' — ') : source.alt;
      lastPhoto = link;
      document.body.classList.add('modal-open');
      lightbox.showModal();
    });
  });
  if (lightbox) {
    lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
    lightbox.addEventListener('click', event => {
      const rect = lightbox.getBoundingClientRect();
      if (event.target === lightbox && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) lightbox.close();
    });
    lightbox.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      if (lastPhoto) lastPhoto.focus({preventScroll: true});
    });
  }

  // Prawdziwe podstrony HTML: normalne adresy, dzialajace odswiezanie i historia.
  // Przechwytujemy tylko zwykle klikniecia w lokalny HTML. Zmodyfikowane klikniecia,
  // pobieranie, maile, linki zewnetrzne oraz otwieranie w nowej karcie nie sa zmieniane.
  let navigating = false;
  document.addEventListener('click', event => {
    if (event.defaultPrevented || motion.matches || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self') || link.hasAttribute('data-gallery')) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (!['http:', 'https:', 'file:'].includes(url.protocol) || url.origin !== location.origin || !url.pathname.endsWith('.html')) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (location.protocol === 'file:' && url.pathname.substring(0, url.pathname.lastIndexOf('/')) !== location.pathname.substring(0, location.pathname.lastIndexOf('/'))) return;
    event.preventDefault();
    if (navigating) return;
    navigating = true;
    document.body.classList.add('is-leaving');
    window.setTimeout(() => { location.assign(url.href); }, 170);
    // Awaryjne przywrocenie tresci, gdy nawigacja zostanie anulowana.
    window.setTimeout(() => {
      document.body.classList.remove('is-leaving');
      navigating = false;
    }, 1800);
  });
  window.addEventListener('pageshow', () => {
    document.body.classList.remove('is-leaving');
    navigating = false;
  });
})();