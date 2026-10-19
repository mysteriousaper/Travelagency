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
    body.dataset.print = 'visa';
    window.print();
  });
});
window.addEventListener('afterprint', () => { delete body.dataset.print; });

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
    openDialog('booking', { context: `${dayInput.value}, ${timeInput.value}` });
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
    if ([...select.options].some((o) => o.value === destination)) select.value = destination;
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
  a.href = body.dataset.wa;
  a.textContent = 'WhatsApp';
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

/* Currency switch for "from" prices (rates come from content/site.yaml) */
const rates = JSON.parse($('#rates')?.textContent || '{}');
const currencyButtons = $$('[data-currency]');
function showPrices(code) {
  const rate = code === 'AMD' ? 1 : rates[code];
  if (!rate) return;
  const fmt = new Intl.NumberFormat(lang, { style: 'currency', currency: code, maximumFractionDigits: 0 });
  $$('[data-price-amd]').forEach((el) => {
    el.textContent = `${el.dataset.prefix} ${fmt.format(Number(el.dataset.priceAmd) / rate)}`;
  });
  currencyButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.currency === code)));
}
currencyButtons.forEach((b) => b.addEventListener('click', () => {
  storageSet('kt-currency', b.dataset.currency);
  showPrices(b.dataset.currency);
}));
showPrices(storageGet('kt-currency') || 'AMD');

/* Remember the chosen language for the next visit to the root address */
storageSet('kt-lang', lang);
