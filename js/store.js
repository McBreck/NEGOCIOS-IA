'use strict';
/* Base de datos simulada (entregable 3.2) guardada en localStorage, con las reglas de negocio RN01–RN06. */
const DB_KEY = 'vetcitas.db.v1';
const SES_KEY = 'vetcitas.sesion.v1';
const VIGENTES = ['PENDIENTE', 'CONFIRMADA', 'REPROGRAMADA'];
const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', cls: 'pend' },
  CONFIRMADA: { label: 'Confirmada', cls: 'conf' },
  REPROGRAMADA: { label: 'Reprogramada', cls: 'repr' },
  CANCELADA: { label: 'Cancelada', cls: 'canc' },
  ATENDIDA: { label: 'Atendida', cls: 'aten' },
  NO_ASISTIO: { label: 'No asistió', cls: 'noas' },
};
const PLAZO_CAMBIO = 2 * HOUR; // RN03
const TOLERANCIA = 15 * MIN;   // RN05
const PASO = 30;               // minutos entre horarios ofrecidos

let db;
const Store = {
  load() {
    try {
      const x = JSON.parse(localStorage.getItem(DB_KEY));
      if (x && x.version === 1) { db = x; return; }
    } catch (e) { /* datos dañados: se regeneran */ }
    db = seed();
    Store.save();
  },
  save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* modo privado: la demo sigue en memoria */ }
  },
  reset() { db = seed(); Store.save(); },
};

function get(t, id) { id = Number(id); return db[t].find(r => r.id === id); }
function insert(t, row) {
  db.seq[t] = (db.seq[t] || 0) + 1;
  const r = { id: db.seq[t], ...row };
  db[t].push(r);
  return r;
}
function removeWhere(t, pred) { db[t] = db[t].filter(r => !pred(r)); }
const nowISO = () => new Date().toISOString();

const Q = {
  userByEmail: c => db.usuarios.find(u => u.correo.toLowerCase() === String(c).trim().toLowerCase()),
  duenoByUser: uid => db.duenos.find(d => d.id_usuario === uid),
  vetByUser: uid => db.veterinarios.find(v => v.id_usuario === uid),
  vetUser: vetId => get('usuarios', get('veterinarios', vetId).id_usuario),
  vetName(vetId, f = 'corto') {
    const u = Q.vetUser(vetId), ap = u.apellidos.split(' ')[0];
    if (f === 'completo') return `MV ${u.nombres} ${u.apellidos}`;
    if (f === 'mini') return `MV ${u.nombres[0]}. ${ap}`;
    return `MV ${u.nombres.split(' ')[0]} ${ap}`;
  },
  vetsActivos: () => db.veterinarios.filter(v => Q.vetUser(v.id).activo),
  petsOf: dId => db.mascotas.filter(m => m.id_dueno === dId && m.activo),
  owner(petId) {
    const m = get('mascotas', petId), d = get('duenos', m.id_dueno);
    return { m, d, u: get('usuarios', d.id_usuario) };
  },
  citasOfPet: petId => db.citas.filter(c => c.id_mascota === petId).sort(by(c => c.inicio, -1)),
  citasOfDueno(dId) {
    const ids = new Set(db.mascotas.filter(m => m.id_dueno === dId).map(m => m.id));
    return db.citas.filter(c => ids.has(c.id_mascota));
  },
  recs: cId => db.recordatorios.filter(r => r.id_cita === cId).sort(by(r => r.programado)),
  historial: cId => db.historial.filter(h => h.id_cita === cId).sort(by(h => h.fecha)),
  mensajes: uid => db.mensajes.filter(m => m.id_usuario === uid).sort(by(m => m.fecha, -1)),
  unread: uid => db.mensajes.filter(m => m.id_usuario === uid && !m.leido).length,
};

/* ---------- Disponibilidad (RN01, RN02, RN06) ---------- */
function franjas(vetId, day) {
  const dow = isoDow(day);
  return db.horarios.filter(h => h.id_vet === vetId && h.dia === dow).sort(by(h => h.inicio))
    .map(h => ({ s: atTime(day, h.inicio), e: atTime(day, h.fin) }));
}
const dentroDeHorario = (vetId, s, e) => franjas(vetId, s).some(f => ms(s) >= ms(f.s) && ms(e) <= ms(f.e));
const bloqueosQueCruzan = (vetId, s, e) => db.bloqueos.filter(b => b.id_vet === vetId && overlap(ms(b.inicio), ms(b.fin), ms(s), ms(e)));
function citasQueCruzan({ vetId, petId, s, e, excluir }) {
  return db.citas.filter(c => c.id !== excluir && VIGENTES.includes(c.estado)
    && (vetId == null || c.id_vet === vetId) && (petId == null || c.id_mascota === petId)
    && overlap(ms(c.inicio), ms(c.fin), ms(s), ms(e)));
}
const vetLibre = (vetId, s, e, excluir) => dentroDeHorario(vetId, s, e) && !bloqueosQueCruzan(vetId, s, e).length && !citasQueCruzan({ vetId, s, e, excluir }).length;
const mascotaLibre = (petId, s, e, excluir) => !citasQueCruzan({ petId, s, e, excluir }).length;

/* Horarios del día: libres si algún veterinario puede atender y la mascota no tiene otra cita. */
function horariosDelDia({ day, servicioId, vetId, petId, excluir }) {
  const sv = get('servicios', servicioId);
  const vets = vetId ? [vetId] : Q.vetsActivos().map(v => v.id);
  const now = Date.now(), map = new Map();
  for (const v of vets) {
    for (const f of franjas(v, day)) {
      for (let t = f.s; ms(addMin(t, sv.duracion)) <= ms(f.e); t = addMin(t, PASO)) {
        if (ms(t) <= now) continue;
        const e = addMin(t, sv.duracion);
        if (!map.has(ms(t))) map.set(ms(t), { inicio: t, vets: [] });
        if (vetLibre(v, t, e, excluir) && (!petId || mascotaLibre(petId, t, e, excluir))) map.get(ms(t)).vets.push(v);
      }
    }
  }
  return [...map.values()].sort(by(x => ms(x.inicio))).map(x => ({ ...x, libre: x.vets.length > 0 }));
}
/* Para «cualquier veterinario» se asigna el que tenga menos citas ese día. */
function elegirVet(vets, day) {
  const carga = v => db.citas.filter(c => c.id_vet === v && VIGENTES.includes(c.estado) && sameDay(c.inicio, day)).length;
  return vets.slice().sort(by(carga))[0];
}

/* ---------- Operaciones sobre la cita ---------- */
function historialAdd(c, ant, nuevo, uid, comentario, extra = {}) {
  insert('historial', {
    id_cita: c.id, estado_anterior: ant, estado_nuevo: nuevo, inicio_anterior: extra.inicio_anterior || null,
    fecha: extra.fecha || nowISO(), id_usuario: uid ?? null, comentario,
  });
}
function setEstado(c, nuevo, uid, comentario, extra = {}) {
  const ant = c.estado;
  c.estado = nuevo;
  c.actualizado_en = extra.fecha || nowISO();
  historialAdd(c, ant, nuevo, uid, comentario, extra);
}
function notificar(c, tipo, rec, fecha) {
  const { d, u } = Q.owner(c.id_mascota);
  return insert('mensajes', {
    id_usuario: u.id, id_cita: c.id, id_rec: rec ? rec.id : null, tipo, canal: rec ? rec.canal : d.canal,
    fecha: fecha || nowISO(), leido: false,
    snap: { inicio: c.inicio, fin: c.fin, id_vet: c.id_vet, id_servicio: c.id_servicio, id_mascota: c.id_mascota },
  });
}
/* RN04: recordatorios a 24 h y 2 h; si faltan menos de 24 h solo se programa el de 2 h. */
function programarRecordatorios(c) {
  removeWhere('recordatorios', r => r.id_cita === c.id && r.estado === 'PENDIENTE');
  db.recordatorios.forEach(r => { if (r.id_cita === c.id) r.usado = true; }); // los enlaces anteriores dejan de servir
  const s = ms(c.inicio), now = Date.now(), canal = Q.owner(c.id_mascota).d.canal;
  [['H24', 24], ['H2', 2]].forEach(([tipo, h]) => {
    if (s - now > h * HOUR) {
      insert('recordatorios', { id_cita: c.id, tipo, canal, ref: c.inicio, programado: new Date(s - h * HOUR).toISOString(), enviado: null, estado: 'PENDIENTE', intentos: 0, token: token(), usado: false });
    }
  });
}
/* Tarea programada (CU09): envía los recordatorios cuyo momento ya llegó. */
function procesarRecordatorios() {
  const now = Date.now();
  let enviados = 0, cambios = false;
  db.recordatorios.slice().forEach(r => {
    if (r.estado !== 'PENDIENTE' || ms(r.programado) > now) return;
    const c = get('citas', r.id_cita);
    cambios = true;
    if (!c || !VIGENTES.includes(c.estado) || ms(c.inicio) <= now) { removeWhere('recordatorios', x => x === r); return; }
    r.estado = 'ENVIADO';
    r.enviado = nowISO();
    r.intentos = 1;
    notificar(c, r.tipo, r);
    enviados++;
  });
  if (cambios) Store.save();
  return enviados;
}
/* Solo para la demo: adelanta el siguiente recordatorio de cada cita vigente del dueño. */
function enviarRecordatorioAhora(uid) {
  const d = Q.duenoByUser(uid);
  let n = 0;
  Q.citasOfDueno(d.id).filter(c => VIGENTES.includes(c.estado) && ms(c.inicio) > Date.now()).forEach(c => {
    const r = Q.recs(c.id).find(x => x.estado === 'PENDIENTE');
    if (r) { r.programado = nowISO(); n++; }
  });
  procesarRecordatorios();
  Store.save();
  return n;
}

function reservar({ petId, servicioId, vetId, inicio, motivo, uid }) {
  const sv = get('servicios', servicioId), s = D(inicio), e = addMin(s, sv.duracion);
  if (ms(s) <= Date.now()) throw new Error('Ese horario ya pasó. Elige otro, por favor.');
  if (!vetLibre(vetId, s, e)) throw new Error('Ese horario acaba de ser tomado por otra persona. Elige otro, por favor.');
  if (!mascotaLibre(petId, s, e)) throw new Error('Tu mascota ya tiene otra cita en ese horario.');
  const now = nowISO();
  const c = insert('citas', {
    id_mascota: petId, id_vet: vetId, id_servicio: servicioId, inicio: s.toISOString(), fin: e.toISOString(),
    estado: 'PENDIENTE', motivo: motivo || '', observaciones: '', creado_por: uid, creado_en: now, actualizado_en: now,
  });
  historialAdd(c, null, 'PENDIENTE', uid, 'Cita registrada en línea');
  programarRecordatorios(c);
  notificar(c, 'CONFIRMACION');
  procesarRecordatorios();
  Store.save();
  return c;
}
const puedeModificar = c => VIGENTES.includes(c.estado) && ms(c.inicio) - Date.now() >= PLAZO_CAMBIO;

function reprogramar(id, nuevo, uid) {
  const c = get('citas', id);
  if (!puedeModificar(c)) throw new Error('Solo puedes reprogramar hasta 2 horas antes de la cita.');
  const s = D(nuevo), e = addMin(s, get('servicios', c.id_servicio).duracion);
  if (ms(s) <= Date.now()) throw new Error('Ese horario ya pasó. Elige otro, por favor.');
  if (!vetLibre(c.id_vet, s, e, c.id)) throw new Error('Ese horario acaba de ser tomado. Elige otro, por favor.');
  if (!mascotaLibre(c.id_mascota, s, e, c.id)) throw new Error('Tu mascota ya tiene otra cita en ese horario.');
  const anterior = c.inicio;
  c.inicio = s.toISOString();
  c.fin = e.toISOString();
  setEstado(c, 'REPROGRAMADA', uid, 'Reprogramada por el dueño', { inicio_anterior: anterior });
  programarRecordatorios(c);
  notificar(c, 'REPROGRAMACION');
  procesarRecordatorios();
  Store.save();
  return c;
}
function cancelar(id, uid, porClinica = false) {
  const c = get('citas', id);
  if (!porClinica && !puedeModificar(c)) throw new Error('Solo puedes cancelar hasta 2 horas antes de la cita.');
  setEstado(c, 'CANCELADA', uid, porClinica ? 'Cancelada por la clínica (bloqueo de agenda)' : 'Cancelada por el dueño');
  removeWhere('recordatorios', r => r.id_cita === c.id && r.estado === 'PENDIENTE');
  notificar(c, porClinica ? 'CANCELACION_CLINICA' : 'CANCELACION');
  Store.save();
}
/* CU08: confirmación con el enlace de un solo uso del recordatorio. */
function confirmarToken(tk, uid) {
  const r = db.recordatorios.find(x => x.token === tk);
  if (!r) return { ok: false, msg: 'El enlace no es válido.' };
  const c = get('citas', r.id_cita);
  if (!VIGENTES.includes(c.estado)) return { ok: false, msg: `La cita ya no está vigente (${ESTADOS[c.estado].label}).` };
  if (r.usado) return { ok: false, msg: c.estado === 'CONFIRMADA' ? 'Ya habías confirmado esta cita.' : 'Este enlace ya no es válido. Usa el recordatorio más reciente.' };
  r.usado = true;
  if (c.estado !== 'CONFIRMADA') setEstado(c, 'CONFIRMADA', uid, 'Asistencia confirmada desde el recordatorio');
  Store.save();
  return { ok: true, c };
}
function registrarAtencion(id, estado, obs, uid) {
  const c = get('citas', id);
  if (!VIGENTES.includes(c.estado)) throw new Error('La cita ya no está vigente.');
  c.observaciones = (obs || '').trim();
  setEstado(c, estado, uid, estado === 'ATENDIDA' ? 'Atención registrada por el veterinario' : 'El dueño no se presentó (tolerancia de 15 min)');
  removeWhere('recordatorios', r => r.id_cita === c.id && r.estado === 'PENDIENTE');
  Store.save();
}
function guardarObs(id, obs) {
  const c = get('citas', id);
  c.observaciones = (obs || '').trim();
  c.actualizado_en = nowISO();
  Store.save();
}
function horarioBase(vetId) {
  for (let d = 1; d <= 6; d++) {
    insert('horarios', { id_vet: vetId, dia: d, inicio: '09:00', fin: '13:00' });
    if (d <= 5) insert('horarios', { id_vet: vetId, dia: d, inicio: '14:00', fin: '18:00' });
  }
}

/* ---------- Datos ficticios de la demo, relativos a la fecha de hoy ---------- */
function diaHabil(base, n) {
  let d = startOfDay(base);
  if (isoDow(d) === 7) d = addDays(d, 1);
  for (let k = Math.abs(n), step = Math.sign(n); k > 0;) {
    d = addDays(d, step);
    if (isoDow(d) !== 7) k--;
  }
  return d;
}
function primerLibre(vetId, sv, petId, desde) {
  for (let i = 0; i < 21; i++) {
    const day = addDays(startOfDay(desde), i);
    for (const f of franjas(vetId, day)) {
      for (let t = f.s; ms(addMin(t, sv.duracion)) <= ms(f.e); t = addMin(t, PASO)) {
        const e = addMin(t, sv.duracion);
        if (ms(t) >= ms(desde) && vetLibre(vetId, t, e) && mascotaLibre(petId, t, e)) return t;
      }
    }
  }
  return null;
}
const OBS = [
  'Buen estado general. Se recomienda control en 6 meses.',
  'Vacuna aplicada sin reacciones. Próxima dosis en un año.',
  'Otitis leve; se indicaron gotas óticas por 7 días.',
  'Desparasitación interna completada. Repetir en 3 meses.',
  'Herida quirúrgica cicatrizando bien. Retirar puntos en 7 días.',
  'Leve sobrepeso; se indicó ajuste de la dieta.',
];
const COMENTARIO = {
  CONFIRMADA: 'Asistencia confirmada desde el recordatorio',
  REPROGRAMADA: 'Reprogramada por el dueño',
  CANCELADA: 'Cancelada por el dueño',
  ATENDIDA: 'Atención registrada por el veterinario',
  NO_ASISTIO: 'El dueño no se presentó (tolerancia de 15 min)',
};

function seed() {
  db = { version: 1, seq: {}, usuarios: [], duenos: [], veterinarios: [], mascotas: [], servicios: [], horarios: [], bloqueos: [], citas: [], historial: [], recordatorios: [], mensajes: [] };
  const now = new Date(), iso = d => D(d).toISOString();
  const usuario = (nombres, apellidos, correo, telefono, pass, rol) => insert('usuarios', { nombres, apellidos, correo, telefono, pass, rol, acepta_datos: true, activo: true, creado_en: iso(addDays(now, -240)) });

  usuario('Recepción', 'Clínica', 'admin@vetcitas.pe', '944 111 222', 'Admin2026', 'ADMIN');
  const [vC, vA] = [
    ['Carlos', 'Rojas Vega', 'carlos.rojas@vetcitas.pe', '955 222 333', '08451', 'Pequeños animales'],
    ['Andrea', 'Salazar Cruz', 'andrea.salazar@vetcitas.pe', '966 333 444', '09127', 'Medicina general'],
  ].map(([n, a, c, t, cmvp, especialidad]) => {
    const u = usuario(n, a, c, t, 'Vet12345', 'VETERINARIO');
    const v = insert('veterinarios', { id_usuario: u.id, cmvp, especialidad });
    horarioBase(v.id);
    return v;
  });
  [['Consulta general', 30, 50, true], ['Vacunación', 15, 40, true], ['Desparasitación', 15, 30, true],
    ['Control postoperatorio', 20, 35, true], ['Baño medicado', 45, 45, true], ['Ecografía', 45, 90, false]]
    .forEach(([nombre, duracion, precio, activo]) => insert('servicios', { nombre, duracion, precio, activo }));
  const svc = n => db.servicios.find(s => s.nombre === n);

  const pet = {};
  [
    ['Lucía', 'Paredes Ríos', 'lucia.paredes@correo.pe', '987 654 321', 'CORREO', [['Rocky', 'Perro', 'Mestizo', 'M', 4.2, 12.4], ['Mishi', 'Gato', 'Siamés', 'H', 2.5, 3.8]]],
    ['Sofía', 'Vera Campos', 'sofia.vera@correo.pe', '981 222 101', 'CORREO', [['Bella', 'Perro', 'Shih tzu', 'H', 3, 6.2]]],
    ['Marco', 'Castro Ruiz', 'marco.castro@correo.pe', '982 333 202', 'SMS', [['Luna', 'Gato', 'Mestizo', 'H', 1.5, 3.1]]],
    ['Rosa', 'León Vargas', 'rosa.leon@correo.pe', '983 444 303', 'CORREO', [['Kira', 'Perro', 'Labrador', 'H', 5, 27.5]]],
    ['Jorge', 'Díaz Soto', 'jorge.diaz@correo.pe', '984 555 404', 'CORREO', [['Coco', 'Perro', 'Poodle', 'M', 7, 8.3]]],
    ['Ana', 'Ruiz Medina', 'ana.ruiz@correo.pe', '985 666 505', 'SMS', [['Toby', 'Perro', 'Beagle', 'M', 2, 11], ['Nala', 'Gato', 'Persa', 'H', 3, 4.2]]],
    ['Pedro', 'Gómez Alva', 'pedro.gomez@correo.pe', '986 777 606', 'CORREO', [['Max', 'Perro', 'Pastor alemán', 'M', 6, 32], ['Simba', 'Gato', 'Mestizo', 'M', 1, 3.5]]],
    ['Carmen', 'Torres Lara', 'carmen.torres@correo.pe', '987 888 707', 'CORREO', [['Bruno', 'Perro', 'Bulldog', 'M', 4, 22.1], ['Lola', 'Perro', 'Chihuahua', 'H', 8, 2.6]]],
    ['Luis', 'Mendoza Paz', 'luis.mendoza@correo.pe', '988 999 808', 'SMS', [['Milo', 'Gato', 'Angora', 'M', 2, 4], ['Canela', 'Perro', 'Cocker', 'H', 5, 13.2]]],
    ['Diana', 'Flores Quispe', 'diana.flores@correo.pe', '989 000 909', 'CORREO', [['Thor', 'Perro', 'Husky', 'M', 3, 24.8], ['Pelusa', 'Gato', 'Mestizo', 'H', 6, 4.4]]],
  ].forEach(([n, a, c, t, canal, mascotas], i) => {
    const u = usuario(n, a, c, t, i === 0 ? 'Lucia2026' : 'Demo2026', 'DUENO');
    const d = insert('duenos', { id_usuario: u.id, dni: null, direccion: '', canal });
    mascotas.forEach(([nombre, especie, raza, sexo, anios, peso]) => {
      pet[nombre] = insert('mascotas', { id_dueno: d.id, nombre, especie, raza, sexo, nacimiento: inDate(addDays(now, -Math.round(anios * 365))), peso, activo: true });
    });
  });

  insert('bloqueos', { id_vet: vC.id, inicio: iso(atTime(diaHabil(now, 2), '11:00')), fin: iso(atTime(diaHabil(now, 2), '13:00')), motivo: 'Cirugía programada' });
  insert('bloqueos', { id_vet: vC.id, inicio: iso(atTime(diaHabil(now, 9), '09:00')), fin: iso(atTime(diaHabil(now, 9), '18:00')), motivo: 'Capacitación externa' });

  const uidOf = m => Q.owner(m.id).u.id;
  const crear = (m, servicio, v, inicio, estado, o = {}) => {
    const sv = svc(servicio), s = D(inicio), e = addMin(s, sv.duracion);
    if (!o.forzar) {
      if (!dentroDeHorario(v.id, s, e) || bloqueosQueCruzan(v.id, s, e).length) return null;
      if (db.citas.some(c => c.estado !== 'CANCELADA' && (c.id_vet === v.id || c.id_mascota === m.id) && overlap(ms(c.inicio), ms(c.fin), ms(s), ms(e)))) return null;
    }
    const creado = o.creado || addDays(s, -4);
    const c = insert('citas', {
      id_mascota: m.id, id_vet: v.id, id_servicio: sv.id, inicio: iso(s), fin: iso(e), estado: 'PENDIENTE',
      motivo: o.motivo || '', observaciones: '', creado_por: uidOf(m), creado_en: iso(creado), actualizado_en: iso(creado),
    });
    historialAdd(c, null, 'PENDIENTE', uidOf(m), 'Cita registrada en línea', { fecha: iso(creado) });
    if (estado !== 'CANCELADA') {
      [['H24', 24], ['H2', 2]].forEach(([tipo, h]) => {
        const p = ms(s) - h * HOUR;
        if (p <= ms(creado)) return;
        const sent = p <= ms(now);
        insert('recordatorios', {
          id_cita: c.id, tipo, canal: Q.owner(m.id).d.canal, ref: iso(s), programado: iso(p), enviado: sent ? iso(p) : null,
          estado: sent ? 'ENVIADO' : 'PENDIENTE', intentos: sent ? 1 : 0, token: token(), usado: sent && estado !== 'PENDIENTE',
        });
      });
    }
    if (estado !== 'PENDIENTE') {
      const t = estado === 'ATENDIDA' ? e : estado === 'NO_ASISTIO' ? addMin(s, 20) : addDays(s, -1);
      const when = new Date(Math.max(ms(creado) + MIN, Math.min(ms(t), ms(now) - MIN)));
      const quien = ['ATENDIDA', 'NO_ASISTIO'].includes(estado) ? v.id_usuario : uidOf(m);
      setEstado(c, estado, quien, o.com || COMENTARIO[estado], { fecha: iso(when), inicio_anterior: estado === 'REPROGRAMADA' ? iso(addDays(s, -1)) : null });
    }
    if (estado === 'ATENDIDA') c.observaciones = o.obs || OBS[c.id % OBS.length];
    return c;
  };

  // Lucía: la próxima cita de Rocky está pendiente y ya recibió el recordatorio de 24 h.
  const sR = primerLibre(vC.id, svc('Consulta general'), pet.Rocky.id, addMin(now, 180));
  if (sR) {
    const creado = addDays(now, -2);
    const c = crear(pet.Rocky, 'Consulta general', vC, sR, 'PENDIENTE', { creado, motivo: 'Control anual y revisión de piel' });
    removeWhere('recordatorios', r => r.id_cita === c.id);
    const env = new Date(Math.min(ms(sR) - 24 * HOUR, ms(now) - 20 * MIN));
    const r24 = insert('recordatorios', { id_cita: c.id, tipo: 'H24', canal: 'CORREO', ref: c.inicio, programado: iso(env), enviado: iso(env), estado: 'ENVIADO', intentos: 1, token: token(), usado: false });
    insert('recordatorios', { id_cita: c.id, tipo: 'H2', canal: 'CORREO', ref: c.inicio, programado: iso(ms(sR) - 2 * HOUR), enviado: null, estado: 'PENDIENTE', intentos: 0, token: token(), usado: false });
    notificar(c, 'CONFIRMACION', null, iso(creado)).leido = true;
    notificar(c, 'H24', r24, iso(env));
  }
  const sM = primerLibre(vA.id, svc('Vacunación'), pet.Mishi.id, atTime(diaHabil(now, 6), '16:00'));
  if (sM) {
    const creado = addDays(now, -1);
    const c = crear(pet.Mishi, 'Vacunación', vA, sM, 'CONFIRMADA', { creado, com: 'Asistencia confirmada por el dueño' });
    notificar(c, 'CONFIRMACION', null, iso(creado)).leido = true;
  }
  crear(pet.Rocky, 'Vacunación', vC, atTime(diaHabil(now, -48), '10:00'), 'ATENDIDA', { forzar: true, obs: 'Vacuna séxtuple aplicada sin reacciones. Próxima dosis en un año.' });
  crear(pet.Rocky, 'Consulta general', vC, atTime(diaHabil(now, -130), '11:00'), 'CANCELADA', { forzar: true });
  crear(pet.Mishi, 'Consulta general', vA, atTime(diaHabil(now, -26), '11:00'), 'ATENDIDA', { forzar: true, obs: 'Control general sin hallazgos. Peso adecuado para su edad.' });

  // Semana actual del veterinario (desplazamiento en días hábiles respecto de hoy).
  [
    [-2, '09:00', 'Bella', 'Consulta general', vC, 'ATENDIDA'], [-2, '09:30', 'Toby', 'Vacunación', vC, 'ATENDIDA'],
    [-2, '10:00', 'Luna', 'Consulta general', vC, 'NO_ASISTIO'], [-2, '11:00', 'Max', 'Control postoperatorio', vC, 'ATENDIDA'],
    [-1, '10:30', 'Kira', 'Desparasitación', vC, 'ATENDIDA'], [-1, '15:00', 'Coco', 'Consulta general', vC, 'ATENDIDA'],
    [-1, '09:30', 'Thor', 'Desparasitación', vA, 'ATENDIDA'], [-1, '16:00', 'Canela', 'Consulta general', vA, 'CANCELADA'],
    [0, '09:00', 'Kira', 'Consulta general', vC, 'CONFIRMADA'], [0, '10:30', 'Bella', 'Baño medicado', vC, 'CONFIRMADA'],
    [0, '11:30', 'Pelusa', 'Vacunación', vC, 'CONFIRMADA'], [0, '15:00', 'Coco', 'Consulta general', vC, 'PENDIENTE'],
    [0, '16:30', 'Luna', 'Consulta general', vC, 'CONFIRMADA'], [0, '10:00', 'Lola', 'Vacunación', vA, 'CONFIRMADA'],
    [0, '15:30', 'Milo', 'Consulta general', vA, 'PENDIENTE'],
    [1, '09:00', 'Nala', 'Consulta general', vC, 'CONFIRMADA'], [1, '15:30', 'Simba', 'Desparasitación', vC, 'REPROGRAMADA'],
    [1, '11:00', 'Max', 'Consulta general', vA, 'PENDIENTE'],
    [2, '10:00', 'Bruno', 'Consulta general', vC, 'PENDIENTE'], [2, '16:00', 'Lola', 'Consulta general', vC, 'CONFIRMADA'],
    [2, '14:30', 'Canela', 'Consulta general', vA, 'CONFIRMADA'],
    [3, '09:30', 'Milo', 'Consulta general', vC, 'PENDIENTE'], [3, '11:00', 'Canela', 'Vacunación', vC, 'CONFIRMADA'],
    [3, '15:00', 'Toby', 'Control postoperatorio', vC, 'PENDIENTE'],
    [4, '09:00', 'Thor', 'Consulta general', vC, 'CONFIRMADA'], [4, '10:30', 'Bella', 'Vacunación', vA, 'PENDIENTE'],
    [5, '09:30', 'Coco', 'Desparasitación', vC, 'PENDIENTE'], [6, '15:00', 'Kira', 'Vacunación', vC, 'PENDIENTE'],
  ].forEach(([off, h, p, s, v, estado]) => crear(pet[p], s, v, atTime(diaHabil(now, off), h), estado));

  // Historial de las semanas anteriores para el reporte del administrador.
  const otros = Object.values(pet).filter(m => m.nombre !== 'Rocky' && m.nombre !== 'Mishi');
  const SV = ['Consulta general', 'Vacunación', 'Desparasitación', 'Consulta general', 'Control postoperatorio', 'Baño medicado'];
  const HS = ['09:00', '10:30', '12:00', '15:00', '16:30'];
  let k = 0;
  for (let i = 3; i <= 40; i++) {
    [vC, vA].forEach((v, j) => {
      for (let r = 0; r < 2; r++) {
        k++;
        const estado = k % 11 === 5 ? 'NO_ASISTIO' : k % 8 === 3 ? 'CANCELADA' : 'ATENDIDA';
        crear(otros[(k * 7) % otros.length], SV[k % SV.length], v, atTime(diaHabil(now, -i), HS[(k + j + r * 2) % HS.length]), estado);
      }
    });
  }
  return db;
}
