'use strict';
/* Componentes de interfaz compartidos: iconos, chips, avisos, modales y despacho de eventos. */
const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bell: '<path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21h4"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  msg: '<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  out: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  paw: '<circle cx="5.5" cy="10" r="2"/><circle cx="9.5" cy="5.5" r="2"/><circle cx="14.5" cy="5.5" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M12 12c-3 0-6 4-6 6.5 0 1.8 1.6 2.5 3 2.5 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.4 0 3-.7 3-2.5C18 16 15 12 12 12z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><circle cx="17" cy="8" r="2.5"/><path d="M17 13c2.4 0 4 1.4 4.8 4"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9-9-9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6A17 17 0 002 12s3.5 7 10 7a9.7 9.7 0 005.4-1.6"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  refresh: '<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>',
  spark: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8L12 3z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8L19 15z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="4"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  heart: '<path d="M12 20s-8-4.8-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6.2-8 11-8 11z"/>',
  quote: '<path d="M7 7h4v5c0 3-2 5-4 5M14 7h4v5c0 3-2 5-4 5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M7 5l12 7-12 7V5z"/>',
  fb: '<path d="M15 3h-2.5A3.5 3.5 0 009 6.5V10H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 011-1h2V3z"/>',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  wa: '<path d="M20 11.5a8.5 8.5 0 01-12.6 7.4L3 20l1.2-4.2A8.5 8.5 0 1120 11.5z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1a4 4 0 01-2.5-2.5l1-1-1-2L9 8.5z"/>',
};
const ic = (n, size = 20) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[n]}</svg>`;
const chip = (estado, label) => `<span class="chip ${ESTADOS[estado].cls}">${label || ESTADOS[estado].label}</span>`;

const ESPECIE = { Perro: ['🐶', '#FDF1E1'], Gato: ['🐱', '#EDEBFB'] };
function petAv(m, size = 44) {
  const [e, bg] = ESPECIE[m.especie] || ['🐾', '#E3F4EE'];
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:${bg};font-size:${Math.round(size * 0.5)}px" aria-hidden="true">${e}</span>`;
}
const especieLbl = m => (m.especie === 'Otra' ? 'Otra especie' : m.sexo === 'H' ? (m.especie === 'Perro' ? 'Perra' : 'Gata') : m.especie);
const sexoLbl = m => (m.sexo === 'M' ? 'Macho' : m.sexo === 'H' ? 'Hembra' : '');
const petLine = m => [especieLbl(m), m.raza, m.peso ? m.peso + ' kg' : ''].filter(Boolean).join(' · ');
const iniciales = u => (u.nombres[0] + u.apellidos[0]).toUpperCase();

/* Despacho de eventos: data-a (clic), data-f (envío de formulario), data-i (entrada de datos). */
const ACT = {}, SUBMIT = {}, INPUT = {};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.a];
  if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  fn(el, e);
});
document.addEventListener('submit', e => {
  const fn = SUBMIT[e.target.dataset.f];
  if (fn) { e.preventDefault(); fn(e.target, e); }
});
['input', 'change'].forEach(t => document.addEventListener(t, e => {
  const el = e.target.closest('[data-i]');
  if (el && INPUT[el.dataset.i]) INPUT[el.dataset.i](el, e);
}));

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.setAttribute('role', type === 'err' ? 'alert' : 'status');
  t.innerHTML = ic(type === 'err' ? 'alert' : type === 'info' ? 'info' : 'check', 18) + `<span>${esc(msg)}</span>`;
  const box = document.getElementById('toasts');
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 4000);
}

let modalResolve = null, modalPrevFocus = null;
const modalOpen = () => !!document.getElementById('modal-root').firstChild;
function openModal(html) {
  closeModal();
  modalPrevFocus = document.activeElement;
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-ov" data-a="modalOv"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-t">${html}</div></div>`;
  const first = root.querySelector('input:not([type=hidden]),select,textarea') || root.querySelector('.modal-actions .btn:last-child') || root.querySelector('button');
  if (first) first.focus();
}
function closeModal() {
  const root = document.getElementById('modal-root');
  if (!root.firstChild) return;
  root.innerHTML = '';
  if (modalResolve) { const r = modalResolve; modalResolve = null; r(false); }
  if (modalPrevFocus && document.contains(modalPrevFocus)) modalPrevFocus.focus();
}
const modalHead = title => `<div class="modal-h"><h2 id="modal-t">${title}</h2><button type="button" class="back" data-a="modalClose" aria-label="Cerrar">${ic('x', 18)}</button></div>`;
/* Diálogo de confirmación: `text` es HTML; los datos variables deben llegar ya escapados. */
function confirmBox({ title, text, ok = 'Aceptar', cancel = 'Volver', danger = false }) {
  return new Promise(res => {
    openModal(`<h2 id="modal-t">${esc(title)}</h2><p class="muted mt8">${text}</p>
      <div class="modal-actions"><button type="button" class="btn sec" data-a="modalClose">${esc(cancel)}</button><button type="button" class="btn ${danger ? 'danger' : 'pri'}" data-a="modalYes">${esc(ok)}</button></div>`);
    modalResolve = res;
  });
}
ACT.modalOv = (el, e) => { if (e.target === el) closeModal(); };
ACT.modalClose = () => closeModal();
ACT.modalYes = () => {
  const r = modalResolve;
  modalResolve = null;
  closeModal();
  if (r) r(true);
};

/* Muestra los errores de validación junto a cada campo; devuelve true si no hay errores. */
function setErrors(form, errs) {
  form.querySelectorAll('.field.err').forEach(f => f.classList.remove('err'));
  form.querySelectorAll('.field .msg').forEach(m => m.remove());
  let first = null;
  for (const [name, msg] of Object.entries(errs)) {
    let inp = form.elements[name];
    if (!inp) continue;
    if (!inp.tagName) inp = inp[0];
    const f = inp.closest('.field');
    f.classList.add('err');
    f.insertAdjacentHTML('beforeend', `<p class="msg" role="alert">${esc(msg)}</p>`);
    first = first || inp;
  }
  if (first) first.focus();
  return !first;
}

/* Botón seleccionable tipo tarjeta (mascota, servicio, veterinario). */
function optCard({ on, a, id, lead = '', title, sub = '' }) {
  return `<button type="button" class="opt-card ${on ? 'on' : ''}" role="radio" aria-checked="${on}" data-a="${a}" data-id="${id}">${lead}<span class="grow min0"><b class="block">${esc(title)}</b>${sub ? `<span class="small muted block">${esc(sub)}</span>` : ''}</span><span class="tick">${on ? ic('check', 14) : ''}</span></button>`;
}

/* Barra lateral de escritorio; en pantallas angostas se convierte en barra superior (o se oculta para el dueño). */
function sideNav({ items, active, u, nombre, rol, cls = '' }) {
  return `<nav class="side ${cls}" aria-label="Menú principal">
      <div class="brand"><span class="logo">${ic('paw', 22)}</span><b>VetCitas</b></div>
      ${items.map(([k, i, l, h, badge]) => `<a class="it ${k === active ? 'on' : ''}" href="${h}"${k === active ? ' aria-current="page"' : ''}>${ic(i, 19)}<span>${l}</span>${badge ? `<span class="side-badge">${badge}<span class="sr"> sin leer</span></span>` : ''}</a>`).join('')}
      <div class="spacer"></div>
      <div class="who"><span class="avatar">${esc(iniciales(u))}</span><div class="min0"><p class="n ellip">${esc(nombre)}</p><p class="r">${rol}</p></div></div>
      <button type="button" class="it out" data-a="logout" aria-label="Cerrar sesión">${ic('out', 19)}<span>Cerrar sesión</span></button>
    </nav>`;
}
/* Estructura de escritorio para veterinario y administrador (P07–P10). */
function deskShell(body, active, extra = '') {
  const u = Session.user(), admin = u.rol === 'ADMIN';
  const items = admin
    ? [['resumen', 'chart', 'Resumen', '#/a/resumen'], ['servicios', 'tag', 'Servicios', '#/a/servicios'], ['veterinarios', 'users', 'Veterinarios', '#/a/veterinarios'], ['agenda', 'cal', 'Agenda general', '#/a/agenda']]
    : [['agenda', 'cal', 'Agenda', '#/v/agenda'], ['horario', 'clock', 'Horario y bloqueos', '#/v/horario'], ['pacientes', 'paw', 'Historial de pacientes', '#/v/pacientes']];
  const nombre = admin ? `${u.nombres} ${u.apellidos}` : `MV ${u.nombres} ${u.apellidos.split(' ')[0]}`;
  return `<div class="d-shell">${sideNav({ items, active, u, nombre, rol: admin ? 'Administrador' : 'Médico veterinario' })}
    <main class="d-main" id="main">${body}</main>${extra}</div>`;
}

/* Resumen que arma el asistente IA y que acompaña a la cita (lo leen el dueño y el veterinario). */
const ORIGEN_IA = { asistente: 'Triage del asistente IA', recomendacion: 'Propuesta preventiva de la IA', cotizacion: 'Cotización del asistente IA', prevencion: 'Agendada con el asistente IA' };
function iaCard(ia, vet = false) {
  if (!ia) return '';
  const resp = Object.entries(ia.respuestas || {});
  return `<section class="ia-card" aria-label="Resumen del asistente IA">
    <div class="row between gap8 wrap"><span class="ia-tag">${ic('spark', 14)} ${vet ? ORIGEN_IA[ia.origen] || 'Asistente IA' : 'Resumen que verá tu veterinario'}</span>${ia.urgencia === 'alta' ? '<span class="chip noas">Prioridad alta</span>' : ''}</div>
    <p class="small mt8">${esc(ia.resumen)}</p>
    ${ia.area || resp.length ? `<div class="kv sm mt8">${ia.area ? `<div><span>Área probable</span><b>${esc(ia.area)}</b></div>` : ''}${resp.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
    ${ia.voz ? `<p class="small mt8"><span class="muted">Nota de voz transcrita:</span> «${esc(ia.voz)}»</p>` : ''}
    ${ia.cotizacion ? `<p class="small mt8"><span class="muted">Cotización estimada:</span> <b>${money(ia.cotizacion.min)} – ${money(ia.cotizacion.max)}</b> (${esc(ia.cotizacion.proc)})</p>` : ''}
    ${ia.fotos && ia.fotos.length ? `<div class="ia-fotos">${ia.fotos.map(f => `<button type="button" data-a="verFoto" aria-label="Ampliar foto"><img src="${f}" alt="Foto enviada por el dueño"></button>`).join('')}</div>` : ''}
    ${vet ? '<p class="xs muted mt8">Generado automáticamente con lo que contó el dueño; confírmalo en la consulta.</p>' : ''}
  </section>`;
}
ACT.verFoto = el => openModal(`${modalHead('Foto enviada por el dueño')}<img class="foto-full" src="${el.querySelector('img').src}" alt="Foto enviada por el dueño">`);
