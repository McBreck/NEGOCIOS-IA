'use strict';
/* Utilidades de fecha, formato y texto. Las horas se muestran en la zona del navegador (America/Lima en la clínica). */
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_C = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_ISO = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const by = (f, dir = 1) => (a, b) => { const x = f(a), y = f(b); return x > y ? dir : x < y ? -dir : 0; };

const D = x => (x instanceof Date ? new Date(x.getTime()) : new Date(x));
const ms = x => D(x).getTime();
function startOfDay(d) { d = D(d); d.setHours(0, 0, 0, 0); return d; }
function addDays(d, n) { d = D(d); d.setDate(d.getDate() + n); return d; }
const addMin = (d, n) => new Date(ms(d) + n * MIN);
function isoDow(d) { const x = D(d).getDay(); return x === 0 ? 7 : x; }
const startOfWeek = d => addDays(startOfDay(d), 1 - isoDow(d));
function atTime(day, hhmm) { const [h, m] = hhmm.split(':').map(Number); const d = startOfDay(day); d.setHours(h, m, 0, 0); return d; }
const sameDay = (a, b) => ms(startOfDay(a)) === ms(startOfDay(b));
const minDia = d => { d = D(d); return d.getHours() * 60 + d.getMinutes(); };
const overlap = (aS, aE, bS, bE) => aS < bE && bS < aE;

const fTime = d => { d = D(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fDate = d => { d = D(d); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
const fDM = d => { d = D(d); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
const fDow = d => DIAS_C[D(d).getDay()];
const fShort = d => fDow(d) + ' ' + fDM(d);
const fLong = d => DIAS[D(d).getDay()] + ' ' + fDate(d);
const fDateTime = d => fDate(d) + ' ' + fTime(d);
const fMonthYear = d => { d = D(d); return cap(MESES[d.getMonth()]) + ' ' + d.getFullYear(); };
function relDay(d, from = new Date()) {
  const diff = Math.round((ms(startOfDay(d)) - ms(startOfDay(from))) / DAY);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'mañana';
  return 'el ' + fShort(d);
}
const fWhen = d => (sameDay(d, new Date()) ? fTime(d) : fDM(d));

const inDate = d => { d = D(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
const money = n => 'S/ ' + Number(n || 0).toFixed(2);
const fmtTel = t => String(t).replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3');

function edad(nac) {
  if (!nac) return '';
  const n = parseDate(nac), h = new Date();
  let m = (h.getFullYear() - n.getFullYear()) * 12 + h.getMonth() - n.getMonth();
  if (h.getDate() < n.getDate()) m--;
  if (m < 1) return 'menos de 1 mes';
  if (m < 12) return plural(m, 'mes', 'meses');
  return plural(Math.floor(m / 12), 'año', 'años');
}
function token() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}
