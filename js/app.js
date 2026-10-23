'use strict';
/* Enrutador por hash, sesión por pestaña y arranque de la aplicación. */
const HOME = { DUENO: '#/d/inicio', VETERINARIO: '#/v/agenda', ADMIN: '#/a/resumen' };

/* La sesión vive en sessionStorage: cada pestaña puede tener un rol distinto (útil para la demostración). */
const Session = {
  uid() { try { return Number(sessionStorage.getItem(SES_KEY)) || null; } catch (e) { return Session.mem || null; } },
  user() { const id = Session.uid(), u = id && get('usuarios', id); return u && u.activo ? u : null; },
  set(id) { Session.mem = id; try { sessionStorage.setItem(SES_KEY, id); } catch (e) { /* sin almacenamiento */ } },
  clear() { Session.mem = null; try { sessionStorage.removeItem(SES_KEY); } catch (e) { /* sin almacenamiento */ } },
};

const ROUTES = [
  ['#/login', null, () => Auth.login()],
  ['#/registro', null, () => Auth.registro()],
  ['#/d/inicio', 'DUENO', () => Owner.home()],
  ['#/d/reservar', 'DUENO', () => Owner.reservar()],
  ['#/d/citas', 'DUENO', () => Owner.citas()],
  ['#/d/cita/:id', 'DUENO', id => Owner.cita(id)],
  ['#/d/reprogramar/:id', 'DUENO', id => Owner.reprogramar(id)],
  ['#/d/mascota/:id', 'DUENO', id => Owner.mascota(id)],
  ['#/d/avisos', 'DUENO', () => Owner.avisos()],
  ['#/d/avisos/:id', 'DUENO', id => Owner.aviso(id)],
  ['#/d/perfil', 'DUENO', () => Owner.perfil()],
  ['#/v/agenda', 'VETERINARIO', () => Vet.agenda()],
  ['#/v/horario', 'VETERINARIO', () => Vet.horario()],
  ['#/v/pacientes', 'VETERINARIO', () => Vet.pacientes()],
  ['#/a/resumen', 'ADMIN', () => Admin.resumen()],
  ['#/a/servicios', 'ADMIN', () => Admin.servicios()],
  ['#/a/veterinarios', 'ADMIN', () => Admin.veterinarios()],
  ['#/a/agenda', 'ADMIN', () => Admin.agenda()],
].map(([p, rol, fn]) => [new RegExp('^' + p.replace(':id', '(\\d+)') + '$'), rol, fn]);

const App = {
  root: document.getElementById('app'),
  last: null,
  changed: false,
  after: [],
  render(html) {
    const a = document.activeElement;
    let sel = null;
    if (!App.changed && a && App.root.contains(a)) {
      if (a.id) sel = '#' + CSS.escape(a.id);
      else if (a.dataset.a) sel = `[data-a="${a.dataset.a}"]` + ['id', 'd', 't', 'm', 'n', 'c', 'p', 's'].filter(k => a.dataset[k] != null).map(k => `[data-${k}="${a.dataset[k]}"]`).join('');
    }
    const keep = {};
    if (!App.changed) document.querySelectorAll('[data-ks]').forEach(el => { keep[el.dataset.ks] = el.scrollLeft; });
    App.root.innerHTML = html;
    document.querySelectorAll('[data-ks]').forEach(el => {
      if (el.dataset.ks in keep) { el.scrollLeft = keep[el.dataset.ks]; el.dataset.restored = '1'; }
    });
    document.body.classList.toggle('lock', !!App.root.querySelector('.drawer'));
    const fns = App.after;
    App.after = [];
    fns.forEach(f => f());
    if (sel) { const el = App.root.querySelector(sel); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  },
  route() {
    procesarRecordatorios();
    const hash = location.hash || '#/login', u = Session.user();
    for (const [re, rol, fn] of ROUTES) {
      const m = hash.match(re);
      if (!m) continue;
      if (rol && (!u || u.rol !== rol)) return go(u ? HOME[u.rol] : '#/login', true);
      if (!rol && u) return go(HOME[u.rol], true);
      App.changed = hash !== App.last;
      App.last = hash;
      if (App.changed) closeModal();
      fn(m[1] ? Number(m[1]) : undefined);
      if (App.changed) {
        window.scrollTo(0, 0);
        App.root.querySelector('h1')?.focus({ preventScroll: true });
        App.changed = false;
      }
      return;
    }
    go(u ? HOME[u.rol] : '#/login', true);
  },
  refresh() { App.route(); },
  startSession(u) {
    Session.set(u.id);
    Object.assign(Owner, { draft: null, rp: null, tab: 'prox' });
    Object.assign(Agenda.st, { sel: null, ref: null });
    Object.assign(Vet, { hor: null, pet: null, q: '' });
    go(HOME[u.rol]);
  },
};
function go(hash, replace) {
  if (location.hash === hash) return App.route();
  if (replace) { location.replace(hash); return; }
  location.hash = hash;
}

ACT.logout = () => {
  Session.clear();
  Owner.draft = null;
  Agenda.st.sel = null;
  Vet.pet = null;
  go('#/login');
  toast('Sesión cerrada.', 'info');
};

const ocupado = () => modalOpen() || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
window.addEventListener('hashchange', () => App.route());
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (modalOpen()) { closeModal(); return; }
  App.root.querySelector('[data-esc]')?.click();
});
/* Otra pestaña cambió los datos (por ejemplo, un dueño reservó): se actualiza la vista. */
window.addEventListener('storage', e => {
  if (e.key !== DB_KEY) return;
  Store.load();
  if (!ocupado()) App.refresh();
});
/* Cada 30 s: envía los recordatorios que vencieron y actualiza la línea de la hora actual en la agenda. */
setInterval(() => {
  const u = Session.user(), antes = u ? Q.unread(u.id) : 0;
  const n = procesarRecordatorios();
  if (u && u.rol === 'DUENO' && Q.unread(u.id) > antes) toast('Te llegó un nuevo aviso de VetCitas.', 'info');
  if (!ocupado() && (n || /agenda/.test(location.hash))) App.refresh();
}, 30000);

Store.load();
App.route();
