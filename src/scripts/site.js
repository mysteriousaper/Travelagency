// Small progressive enhancements. Every page still reads correctly without JavaScript;
// forms need it to send (they post JSON to /api/lead).

const body = document.body;
const lang = body.dataset.lang || 'hy';
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode: ignore */ }
}

/* Mobile menu */
const menuToggle = $('[data-menu-toggle]');
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    const nav = document.getElementById(menuToggle.getAttribute('aria-controls'));
    const open = nav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
}

/* Chip groups: one value (or several with data-multiple) written into the group's hidden input */
function syncChips(group) {
  const input = $('input[type="hidden"]', group);
  const picked = $$('.chip[aria-pressed="true"]', group).map((b) => b.dataset.value);
  if (input) input.value = picked.join(', ');
  group.dispatchEvent(new CustomEvent('chips-change', { bubbles: true, detail: picked }));
}
function bindChips(group) {
  if (group.dataset.bound) return;
  group.dataset.bound = '1';
  const multiple = group.hasAttribute('data-multiple');
  group.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip || !group.contains(chip)) return;
    if (multiple) {
      chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    } else {
      $$('.chip', group).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    }
    syncChips(group);
  });
}
function resetChips(form) {
  $$('[data-chips]', form).forEach((group) => {
    const input = $('input[type="hidden"]', group);
    if (!input) return;
    const values = input.value.split(', ');
    $$('.chip', group).forEach((c) => c.setAttribute('aria-pressed', String(values.includes(c.dataset.value))));
  });
}
$$('[data-chips]').forEach(bindChips);

/* Tabs */
$$('[data-tabs]').forEach((list) => {
  const tabs = $$('[role="tab"]', list);
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next);
      next.focus();
    });
  });
});

/* Visa checker */
$$('[data-visa]').forEach((root) => {
  const buttons = $$('[data-country]', root);
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      $$('[data-visa-list]', root).forEach((list) => list.classList.toggle('is-active', list.dataset.visaList === btn.dataset.country));
      root.dataset.current = btn.dataset.countryName;
    });
  });
  $('[data-print-visa]', root)?.addEventListener('click', () => {
    const sheet = $('#print-sheet');
    const active = $('[data-country][aria-pressed="true"]', root);
    $('[data-print-country]', sheet).textContent = active?.dataset.countryName || '';
    $('[data-print-date]', sheet).textContent = new Date().toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
    const list = $('[data-print-list]', sheet);
    list.replaceChildren(...$$('.visa-list.is-active li', root).map((li) => {
      const item = document.createElement('li');
      item.textContent = li.textContent.trim();
      return item;
    }));
    body.dataset.print = 'visa';
    window.print();
  });
});
window.addEventListener('afterprint', () => { delete body.dataset.print; });

/* Dropdowns: the native <select> stays in the form (and works without JavaScript);
   the site draws its own list so it looks the same everywhere, and the whole field is clickable. */
const chevron = '<svg class="dd-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
let ddCount = 0;
function closeDropdown(field, focusButton = false) {
  if (!field.classList.contains('is-open')) return;
  field.classList.remove('is-open');
  const btn = $('.dd-btn', field);
  btn.setAttribute('aria-expanded', 'false');
  if (focusButton) btn.focus();
}
function enhanceSelect(select) {
  const field = select.closest('.field');
  if (!field || field.classList.contains('has-dd')) return;
  const id = `dd-${++ddCount}`;
  const label = [...field.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dd-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', id);
  btn.innerHTML = `<span class="dd-value"></span>${chevron}`;
  const list = document.createElement('ul');
  list.className = 'dd-list';
  list.id = id;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', label);
  list.tabIndex = -1;
  const items = [...select.options].map((opt, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.id = `${id}-${i}`;
    li.textContent = opt.text;
    list.append(li);
    return li;
  });
  select.classList.add('dd-native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  select.before(btn);
  field.append(list);
  field.classList.add('has-dd');

  let active = select.selectedIndex;
  const setActive = (i) => {
    active = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((li, j) => li.classList.toggle('is-active', j === active));
    list.setAttribute('aria-activedescendant', items[active].id);
    items[active].scrollIntoView({ block: 'nearest' });
  };
  const sync = () => {
    const i = select.selectedIndex;
    $('.dd-value', btn).textContent = select.options[i]?.text ?? '';
    btn.setAttribute('aria-label', `${label}: ${select.options[i]?.text ?? ''}`);
    items.forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
  };
  const choose = (i) => {
    if (select.selectedIndex !== i) {
      select.selectedIndex = i;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    closeDropdown(field, true);
  };
  const open = () => {
    $$('.field.is-open').forEach((f) => closeDropdown(f));
    field.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    setActive(select.selectedIndex);
    list.focus({ preventScroll: true });
  };

  btn.addEventListener('click', () => (field.classList.contains('is-open') ? closeDropdown(field, true) : open()));
  btn.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); }
  });
  list.addEventListener('click', (e) => {
    e.preventDefault(); // stop the surrounding <label> from re-clicking the button
    const li = e.target.closest('li');
    if (li) choose(items.indexOf(li));
  });
  list.addEventListener('mousemove', (e) => {
    const li = e.target.closest('li');
    if (li && items.indexOf(li) !== active) setActive(items.indexOf(li));
  });
  list.addEventListener('keydown', (e) => {
    const keys = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: items.length - 1, PageDown: active + 5, PageUp: active - 5 };
    if (e.key in keys) { e.preventDefault(); setActive(keys[e.key]); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDropdown(field, true); }
    else if (e.key === 'Tab') closeDropdown(field);
    else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const next = items.findIndex((li, j) => j > active && li.textContent.toLowerCase().startsWith(k));
      const first = items.findIndex((li) => li.textContent.toLowerCase().startsWith(k));
      if (next >= 0 || first >= 0) setActive(next >= 0 ? next : first);
    }
  });
  select.addEventListener('change', sync);
  select.form?.addEventListener('reset', () => setTimeout(sync));
  sync();
}
$$('.field select').forEach(enhanceSelect);
document.addEventListener('pointerdown', (e) => {
  $$('.field.is-open').forEach((f) => { if (!f.contains(e.target)) closeDropdown(f); });
});

/* Date fields: a click anywhere on the field opens the calendar */
$$('.field input[type="date"]').forEach((input) => {
  const field = input.closest('.field');
  field.classList.add('has-picker');
  field.addEventListener('click', (e) => {
    if (e.target === input) return;
    e.preventDefault();
    input.focus();
    try { input.showPicker(); } catch { /* older browsers: focus is enough */ }
  });
});

/* Questions and answers */
$$('.faq-q').forEach((btn) => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const open = item.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
});

/* Tour filters */
$$('[data-filter-root]').forEach((root) => {
  const buttons = $$('[data-filter]', root);
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const region = btn.dataset.filter;
      $$('[data-region]', root).forEach((card) => { card.hidden = region !== 'all' && card.dataset.region !== region; });
    });
  });
});

/* Office visit slots, built from the open days and times in content/site.yaml */
$$('[data-office]').forEach((root) => {
  const cfg = JSON.parse(root.dataset.office);
  const dayRow = $('[data-days]', root);
  const dayInput = $('input[name="day"]', root);
  const timeInput = $('input[name="time"]', root);
  const weekday = new Intl.DateTimeFormat(lang, { weekday: 'short' });
  const full = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const days = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (days.length < cfg.days_ahead) {
    d.setDate(d.getDate() + 1);
    const iso = d.getDay() === 0 ? 7 : d.getDay();
    if (cfg.open_days.includes(iso)) days.push(new Date(d));
  }
  days.forEach((day, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.value = full.format(day);
    b.setAttribute('aria-pressed', String(i === 0));
    const top = document.createElement('span');
    top.textContent = weekday.format(day);
    const num = document.createElement('b');
    num.textContent = String(day.getDate());
    b.append(top, num);
    b.setAttribute('aria-label', full.format(day));
    dayRow.append(b);
  });
  if (dayInput && days[0]) dayInput.value = full.format(days[0]);
  bindChips(dayRow);
  const label = $('[data-slot-label]', root);
  const update = () => { if (label) label.textContent = `${dayInput.value}, ${timeInput.value}`; };
  root.addEventListener('chips-change', update);
  update();
  $('[data-office-book]', root)?.addEventListener('click', () => {
    const office = $('input[name="office"]', root)?.value;
    openDialog('booking', { context: [office, `${dayInput.value}, ${timeInput.value}`].filter(Boolean).join(' · ') });
  });
});

/* Tour builder: picked destinations + trip type go into the quote dialog */
$$('[data-builder]').forEach((root) => {
  const count = $('[data-builder-count]', root);
  root.addEventListener('chips-change', () => {
    count.textContent = String($$('[data-builder-places] .chip[aria-pressed="true"]', root).length);
  });
  $('[data-builder-submit]', root).addEventListener('click', () => {
    const places = $('[data-builder-places] input', root).value;
    const type = $('[data-builder-type] input', root).value;
    openDialog('quote', { context: [places, type].filter(Boolean).join(' · ') });
  });
});

/* Dialog shared by "Plan my trip", visa consultation, office visit and call-back */
const dialog = $('#quote-dialog');
function openDialog(type, { context = '', destination = '' } = {}) {
  if (!dialog) return;
  const form = $('form', dialog);
  form.dataset.lead = type;
  $$('[data-title-for]', dialog).forEach((el) => { el.hidden = el.dataset.titleFor !== type; });
  $$('[data-only]', dialog).forEach((el) => { el.hidden = !el.dataset.only.split(' ').includes(type); });
  $('input[name="context"]', form).value = context;
  const ctx = $('[data-context-text]', dialog);
  ctx.textContent = context;
  ctx.hidden = !context;
  if (destination) {
    const select = $('select[name="destination"]', form);
    if ([...select.options].some((o) => o.value === destination)) {
      select.value = destination;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  const status = $('[data-status]', form);
  status.textContent = '';
  status.className = 'form-status';
  dialog.showModal();
  $('input[name="name"]', form).focus();
}
$$('[data-open-dialog]').forEach((btn) => {
  btn.addEventListener('click', () => openDialog(btn.dataset.openDialog, {
    context: btn.dataset.context || '',
    destination: btn.dataset.destination || '',
  }));
});
$$('[data-close-dialog]').forEach((btn) => btn.addEventListener('click', () => dialog.close()));
dialog?.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

/* Sending requests */
const CORE = ['name', 'phone', 'email', 'channel', 'website'];
function collect(form) {
  const data = { type: form.dataset.lead, lang, page: location.pathname, details: {} };
  for (const el of form.elements) {
    if (!el.name) continue;
    if (CORE.includes(el.name)) data[el.name] = el.value;
    else if (el.dataset.detail && el.value && !el.closest('[hidden]')) data.details[el.dataset.detail] = el.value;
  }
  return data;
}
function showError(status, text) {
  status.className = 'form-status is-error';
  status.textContent = `${text} `;
  const a = document.createElement('a');
  a.href = body.dataset.fallbackHref;
  a.textContent = body.dataset.fallbackLabel;
  status.append(a);
}
$$('form[data-lead]').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('[data-status]', form) || $('[data-status]', form.parentElement);
    const email = form.elements.email;
    if (email && form.elements.channel) email.required = form.elements.channel.value === 'Email';
    if (!form.checkValidity()) {
      status.className = 'form-status is-error';
      status.textContent = body.dataset.msgInvalid;
      form.reportValidity();
      return;
    }
    const button = $('button[type="submit"]', form);
    button.disabled = true;
    status.className = 'form-status';
    status.textContent = body.dataset.msgSending;
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collect(form)),
      });
      if (!res.ok) throw new Error(String(res.status));
      status.className = 'form-status is-ok';
      status.textContent = body.dataset.msgOk;
      form.reset();
      resetChips(form);
    } catch {
      showError(status, body.dataset.msgError);
    } finally {
      button.disabled = false;
    }
  });
});

/* Currency switch. Prices show in their own currency until the visitor picks one.
   Rates: Central Bank of Armenia, via /api/rates (dram per unit). */
const currencyButtons = $$('[data-currency]');
let rates = { AMD: 1 };
function showPrices(code) {
  if (!rates[code]) return;
  const fmt = new Intl.NumberFormat(lang, { style: 'currency', currency: code, maximumFractionDigits: 0 });
  $$('[data-price]').forEach((el) => {
    const from = el.dataset.cur || 'AMD';
    if (!rates[from]) return;
    const amd = Number(el.dataset.price) * rates[from];
    el.textContent = `${el.dataset.prefix} ${fmt.format(amd / rates[code])}`.trim();
  });
  currencyButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.currency === code)));
}
currencyButtons.forEach((b) => b.addEventListener('click', () => {
  storageSet('kt-currency', b.dataset.currency);
  showPrices(b.dataset.currency);
}));
if (currencyButtons.length) {
  currencyButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
  const embedded = () => {
    const data = JSON.parse($('#rates-fallback')?.textContent || 'null');
    return data?.rates ? { ...data, source: 'Central Bank of Armenia' } : Promise.reject(new Error('no rates'));
  };
  fetch('/api/rates')
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .catch(embedded)
    .then((data) => {
      rates = { AMD: 1, ...(data.rates || {}) };
      const note = data.date ? `${data.source}, ${new Date(data.date).toLocaleDateString(lang)}` : data.source;
      currencyButtons.forEach((b) => {
        const code = b.dataset.currency;
        if (rates[code]) b.disabled = false;
        if (code !== 'AMD' && rates[code]) b.title = `1 ${code} = ${rates[code]} AMD (${note})`;
      });
      const saved = storageGet('kt-currency');
      if (saved) showPrices(saved);
    })
    .catch(() => { /* rates unavailable: prices stay as published */ });
}

/* Remember the chosen language for the next visit to the root address */
storageSet('kt-lang', lang);
