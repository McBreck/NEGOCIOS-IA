'use strict';
/* P10 Panel de administración: servicios (RF15), cuentas de veterinarios (RF16), reporte (RF17) y agenda general (RF11). */
const Admin = { desde: null, hasta: null, agVet: null };

function rango() {
  if (!Admin.desde) {
    const n = new Date();
    Admin.desde = inDate(new Date(n.getFullYear(), n.getMonth(), 1));
    Admin.hasta = inDate(new Date(n.getFullYear(), n.getMonth() + 1, 0));
  }
  return [parseDate(Admin.desde), addDays(parseDate(Admin.hasta), 1)];
}
function citasEnRango() {
  const [a, b] = rango();
  return db.citas.filter(c => ms(c.inicio) >= ms(a) && ms(c.inicio) < ms(b));
}
function stats(cs) {
  const n = e => cs.filter(c => c.estado === e).length;
  return { n: cs.length, aten: n('ATENDIDA'), noas: n('NO_ASISTIO'), canc: n('CANCELADA'), vig: cs.filter(c => VIGENTES.includes(c.estado)).length };
}
const pct = (a, n) => (n ? Math.round((a * 100) / n) : 0);
const kpi = (l, v, sub, color) => `<div class="card kpi"><p class="small muted">${l}</p><p class="v" style="color:${color}">${v}</p><p class="xs muted">${sub}</p></div>`;
const iconBtn = (a, id, label) => `<button type="button" class="iconbtn" data-a="${a}" data-id="${id}" aria-label="${label}">${ic('edit', 16)}</button>`;

function servTable() {
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Servicio</th><th>Duración</th><th>Precio ref.</th><th>Activo</th><th><span class="sr">Editar</span></th></tr></thead><tbody>
    ${db.servicios.map(s => `<tr><td><b>${esc(s.nombre)}</b></td><td>${s.duracion} min</td><td>${money(s.precio)}</td>
      <td><button type="button" class="toggle" role="switch" aria-checked="${s.activo}" aria-label="${esc(s.nombre)}: visible para reservas" data-a="svcToggle" data-id="${s.id}"></button></td>
      <td class="num">${iconBtn('svcEdit', s.id, 'Editar ' + esc(s.nombre))}</td></tr>`).join('')}</tbody></table></div>`;
}
function vetTable(full) {
  const vig = v => db.citas.filter(c => c.id_vet === v.id && VIGENTES.includes(c.estado) && ms(c.inicio) > Date.now()).length;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nombre</th>${full ? '<th>Correo</th>' : ''}<th>CMVP</th><th>Especialidad</th>${full ? '<th>Citas próximas</th>' : ''}<th>Activo</th><th><span class="sr">Editar</span></th></tr></thead><tbody>
    ${db.veterinarios.map(v => {
      const u = Q.vetUser(v.id);
      return `<tr><td><b>${esc(Q.vetName(v.id, 'completo'))}</b></td>${full ? `<td>${esc(u.correo)}</td>` : ''}<td>${esc(v.cmvp)}</td><td>${esc(v.especialidad || '—')}</td>${full ? `<td>${vig(v)}</td>` : ''}
        <td><button type="button" class="toggle" role="switch" aria-checked="${u.activo}" aria-label="Cuenta de ${esc(Q.vetName(v.id))} activa" data-a="vetToggle" data-id="${v.id}"></button></td>
        <td class="num">${iconBtn('vetEdit', v.id, 'Editar ' + esc(Q.vetName(v.id)))}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}
function bars(s) {
  return [['Atendidas', s.aten, 'var(--aten)'], ['Vigentes', s.vig, 'var(--ok)'], ['Canceladas', s.canc, 'var(--faint)'], ['No asistió', s.noas, 'var(--err)']]
    .map(([l, n, c]) => `<div class="bar-row"><span>${l}</span><div class="bar" role="img" aria-label="${l}: ${n} (${pct(n, s.n)} %)"><i style="width:${pct(n, s.n)}%;background:${c}"></i></div><span class="num">${n}</span></div>`).join('');
}
function porVet(cs) {
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Veterinario</th><th class="num">Citas</th><th class="num">Atendidas</th><th class="num">No asistió</th><th class="num">Canceladas</th><th class="num">Vigentes</th><th class="num">% inasistencia</th></tr></thead><tbody>
    ${db.veterinarios.map(v => {
      const s = stats(cs.filter(c => c.id_vet === v.id));
      return `<tr><td><b>${esc(Q.vetName(v.id, 'completo'))}</b></td><td class="num">${s.n}</td><td class="num">${s.aten}</td><td class="num">${s.noas}</td><td class="num">${s.canc}</td><td class="num">${s.vig}</td><td class="num">${pct(s.noas, s.n)} %</td></tr>`;
    }).join('')}</tbody></table></div>`;
}
const rangeInputs = () => `<div class="range"><label class="sr" for="rg-d">Desde</label><input id="rg-d" class="input" type="date" value="${Admin.desde}" max="${Admin.hasta}" data-i="rgDesde">
  <span class="muted">–</span><label class="sr" for="rg-h">Hasta</label><input id="rg-h" class="input" type="date" value="${Admin.hasta}" min="${Admin.desde}" data-i="rgHasta"></div>`;

Admin.resumen = () => {
  const [a, b] = rango(), cs = citasEnRango(), s = stats(cs);
  const body = `<div class="d-head"><div><p class="small muted">Reporte de citas por estado e inasistencias</p><h1 tabindex="-1">Panel de administración</h1></div>
      <div class="row gap8 wrap">${rangeInputs()}<button type="button" class="btn sm pri" data-a="csv">${ic('download', 16)} Descargar reporte</button></div></div>
    <div class="kpis">${kpi('Citas del periodo', s.n, `${fDate(a)} – ${fDate(addDays(b, -1))}`, 'var(--navy)')}${kpi('Atendidas', s.aten, pct(s.aten, s.n) + ' %', 'var(--aten)')}${kpi('Inasistencias', s.noas, pct(s.noas, s.n) + ' %', 'var(--err)')}${kpi('Canceladas', s.canc, pct(s.canc, s.n) + ' %', 'var(--muted)')}</div>
    <div class="grid2">
      <section class="card p0" aria-labelledby="sv-t"><div class="card-h"><h2 id="sv-t">Servicios</h2><button type="button" class="btn sm sec" data-a="svcNew">${ic('plus', 16)} Nuevo servicio</button></div>${servTable()}</section>
      <section class="card p0" aria-labelledby="mv-t"><div class="card-h"><h2 id="mv-t">Médicos veterinarios</h2><button type="button" class="btn sm sec" data-a="vetNew">${ic('plus', 16)} Nueva cuenta</button></div>${vetTable(false)}
        <div class="bars"><h3 class="mb8">Citas por estado</h3>${bars(s)}</div></section>
    </div>
    <section class="card p0" aria-labelledby="pv-t"><div class="card-h"><h2 id="pv-t">Detalle por veterinario</h2></div>${porVet(cs)}</section>`;
  App.render(deskShell(body, 'resumen'));
};
Admin.servicios = () => {
  App.render(deskShell(`<div class="d-head"><div><p class="small muted">Catálogo de servicios y su duración</p><h1 tabindex="-1">Servicios</h1></div><button type="button" class="btn sm pri" data-a="svcNew">${ic('plus', 16)} Nuevo servicio</button></div>
    <div class="note info">${ic('info', 18)}<span>La duración define cuánto tiempo ocupa la cita en la agenda. Un servicio inactivo no aparece al reservar.</span></div>
    <section class="card p0" aria-label="Servicios">${servTable()}</section>`, 'servicios'));
};
Admin.veterinarios = () => {
  App.render(deskShell(`<div class="d-head"><div><p class="small muted">Cuentas de acceso de los médicos veterinarios</p><h1 tabindex="-1">Médicos veterinarios</h1></div><button type="button" class="btn sm pri" data-a="vetNew">${ic('plus', 16)} Nueva cuenta</button></div>
    <div class="note info">${ic('info', 18)}<span>Una cuenta desactivada no puede ingresar ni recibe nuevas reservas; sus citas existentes se mantienen.</span></div>
    <section class="card p0" aria-label="Médicos veterinarios">${vetTable(true)}</section>`, 'veterinarios'));
};
Admin.agenda = () => {
  if (!get('veterinarios', Admin.agVet)) Admin.agVet = db.veterinarios[0].id;
  App.render(deskShell(Agenda.view({ vetId: Admin.agVet, admin: true }), 'agenda', Agenda.drawer(false, true)));
};

function setRango(desde, hasta) {
  if (!desde || !hasta) return;
  if (desde > hasta) { toast('La fecha inicial no puede ser posterior a la final.', 'err'); return App.refresh(); }
  Admin.desde = desde;
  Admin.hasta = hasta;
  App.refresh();
}
INPUT.rgDesde = (el, e) => { if (e.type === 'change') setRango(el.value, Admin.hasta); };
INPUT.rgHasta = (el, e) => { if (e.type === 'change') setRango(Admin.desde, el.value); };
INPUT.agVet = (el, e) => { if (e.type !== 'change') return; Admin.agVet = +el.value; Agenda.st.sel = null; App.refresh(); };

ACT.csv = () => {
  const cs = citasEnRango().sort(by(c => c.inicio));
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = cs.map(c => {
    const { m, u } = Q.owner(c.id_mascota);
    return [c.id, fDate(c.inicio), fTime(c.inicio), fTime(c.fin), m.nombre, m.especie, `${u.nombres} ${u.apellidos}`, u.telefono, get('servicios', c.id_servicio).nombre, Q.vetName(c.id_vet, 'completo'), ESTADOS[c.estado].label, c.motivo, c.observaciones];
  });
  const head = ['ID', 'Fecha', 'Hora inicio', 'Hora fin', 'Mascota', 'Especie', 'Dueño', 'Celular', 'Servicio', 'Veterinario', 'Estado', 'Motivo', 'Observaciones'];
  const csv = '﻿' + [head, ...filas].map(r => r.map(q).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `reporte-citas_${Admin.desde}_${Admin.hasta}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(`Reporte descargado con ${plural(cs.length, 'cita', 'citas')}.`);
};

/* ---------- Servicios ---------- */
function svcForm(s) {
  return `${modalHead(s ? 'Editar servicio' : 'Nuevo servicio')}
  <form data-f="svc" data-id="${s ? s.id : ''}" novalidate>
    <div class="field"><label for="s-n">Nombre</label><input class="input" id="s-n" name="nombre" maxlength="60" value="${esc(s ? s.nombre : '')}"></div>
    <div class="row gap8 top">
      <div class="field grow"><label for="s-d">Duración (min)</label><input class="input" id="s-d" name="duracion" type="number" min="10" max="240" step="5" inputmode="numeric" value="${s ? s.duracion : 30}"><p class="hint">Entre 10 y 240 minutos.</p></div>
      <div class="field grow"><label for="s-p">Precio ref. (S/)</label><input class="input" id="s-p" name="precio" type="number" min="0" step="0.5" inputmode="decimal" value="${s ? s.precio : ''}"></div>
    </div>
    <div class="field"><label class="check"><input type="checkbox" name="activo" ${!s || s.activo ? 'checked' : ''}><span>Visible para reservas</span></label></div>
    <div class="modal-actions"><button type="button" class="btn sec" data-a="modalClose">Cancelar</button><button class="btn pri">Guardar</button></div>
  </form>`;
}
ACT.svcNew = () => openModal(svcForm(null));
ACT.svcEdit = el => openModal(svcForm(get('servicios', el.dataset.id)));
SUBMIT.svc = f => {
  const id = Number(f.dataset.id) || null, nombre = f.nombre.value.trim(), dur = Number(f.duracion.value), precio = f.precio.value === '' ? 0 : Number(f.precio.value);
  const errs = {};
  if (!nombre) errs.nombre = 'Escribe el nombre del servicio.';
  else if (db.servicios.some(s => s.id !== id && norm(s.nombre) === norm(nombre))) errs.nombre = 'Ya existe un servicio con ese nombre.';
  if (!Number.isInteger(dur) || dur < 10 || dur > 240) errs.duracion = 'La duración debe ser un número entero entre 10 y 240.';
  if (!(precio >= 0)) errs.precio = 'El precio no puede ser negativo.';
  if (!setErrors(f, errs)) return;
  const data = { nombre, duracion: dur, precio, activo: f.activo.checked };
  if (id) Object.assign(get('servicios', id), data); else insert('servicios', data);
  Store.save();
  closeModal();
  toast(id ? 'Servicio actualizado.' : `Servicio «${nombre}» creado.`);
  App.refresh();
};
ACT.svcToggle = el => {
  const s = get('servicios', el.dataset.id);
  s.activo = !s.activo;
  Store.save();
  toast(s.activo ? `«${s.nombre}» ya aparece en la reserva.` : `«${s.nombre}» ya no aparece en la reserva.`, 'info');
  App.refresh();
};

/* ---------- Cuentas de veterinarios ---------- */
function vetForm(v) {
  const u = v ? Q.vetUser(v.id) : { nombres: '', apellidos: '', correo: '', telefono: '' };
  const f = (id, name, label, val, extra = '') => `<div class="field grow"><label for="${id}">${label}</label><input class="input" id="${id}" name="${name}" value="${esc(val)}" ${extra}></div>`;
  return `${modalHead(v ? 'Editar cuenta' : 'Nueva cuenta de veterinario')}
  <form data-f="vet" data-id="${v ? v.id : ''}" novalidate>
    <div class="row gap8 top">${f('v-n', 'nombres', 'Nombres', u.nombres, 'maxlength="60"')}${f('v-a', 'apellidos', 'Apellidos', u.apellidos, 'maxlength="60"')}</div>
    ${f('v-c', 'correo', 'Correo de acceso', u.correo, 'type="email" inputmode="email" maxlength="120"')}
    <div class="row gap8 top">${f('v-m', 'cmvp', 'N.° de colegiatura (CMVP)', v ? v.cmvp : '', 'inputmode="numeric" maxlength="10"')}${f('v-t', 'telefono', 'Celular (opcional)', u.telefono, 'type="tel" inputmode="numeric" maxlength="11"')}</div>
    ${f('v-e', 'especialidad', 'Especialidad', v ? v.especialidad : '', 'maxlength="60" placeholder="Ej.: Pequeños animales"')}
    ${v ? '' : `${f('v-p', 'pass', 'Contraseña temporal', 'Vet' + String(Math.floor(10000 + Math.random() * 90000)), 'maxlength="40"')}<p class="hint" style="margin:-8px 0 14px">Compártela con el veterinario; tendrá el horario base de lunes a sábado.</p>`}
    <div class="modal-actions"><button type="button" class="btn sec" data-a="modalClose">Cancelar</button><button class="btn pri">${v ? 'Guardar' : 'Crear cuenta'}</button></div>
  </form>`;
}
ACT.vetNew = () => openModal(vetForm(null));
ACT.vetEdit = el => openModal(vetForm(get('veterinarios', el.dataset.id)));
SUBMIT.vet = f => {
  const id = Number(f.dataset.id) || null, v = id ? get('veterinarios', id) : null, u = v ? Q.vetUser(v.id) : null;
  const val = k => f[k].value.trim(), tel = val('telefono').replace(/\D/g, ''), errs = {};
  if (val('nombres').length < 2) errs.nombres = 'Escribe los nombres.';
  if (val('apellidos').length < 2) errs.apellidos = 'Escribe los apellidos.';
  if (!EMAIL_RE.test(val('correo'))) errs.correo = 'Ingresa un correo válido.';
  else { const o = Q.userByEmail(val('correo')); if (o && (!u || o.id !== u.id)) errs.correo = 'Ese correo ya está en uso.'; }
  if (!/^\d{4,10}$/.test(val('cmvp'))) errs.cmvp = 'El CMVP debe tener entre 4 y 10 dígitos.';
  else if (db.veterinarios.some(x => x.cmvp === val('cmvp') && x.id !== id)) errs.cmvp = 'Ese número de colegiatura ya está registrado.';
  if (tel && !/^9\d{8}$/.test(tel)) errs.telefono = 'Celular de 9 dígitos que empiece con 9.';
  if (!v && f.pass.value.length < 8) errs.pass = 'Mínimo 8 caracteres.';
  if (!setErrors(f, errs)) return;
  const datos = { nombres: val('nombres'), apellidos: val('apellidos'), correo: val('correo').toLowerCase(), telefono: tel ? fmtTel(tel) : '' };
  if (v) {
    Object.assign(u, datos);
    Object.assign(v, { cmvp: val('cmvp'), especialidad: val('especialidad') });
  } else {
    const nu = insert('usuarios', { ...datos, pass: f.pass.value, rol: 'VETERINARIO', acepta_datos: true, activo: true, creado_en: nowISO() });
    horarioBase(insert('veterinarios', { id_usuario: nu.id, cmvp: val('cmvp'), especialidad: val('especialidad') }).id);
  }
  Store.save();
  closeModal();
  toast(v ? 'Cuenta actualizada.' : 'Cuenta creada. Comparte el correo y la contraseña temporal con el veterinario.');
  App.refresh();
};
ACT.vetToggle = async el => {
  const v = get('veterinarios', el.dataset.id), u = Q.vetUser(v.id);
  if (u.activo) {
    const n = db.citas.filter(c => c.id_vet === v.id && VIGENTES.includes(c.estado) && ms(c.inicio) > Date.now()).length;
    const ok = await confirmBox({
      title: `¿Desactivar a ${Q.vetName(v.id)}?`,
      text: `No podrá ingresar ni recibirá nuevas reservas.${n ? ` Tiene <b>${plural(n, 'cita próxima', 'citas próximas')}</b>, que se mantienen en su agenda.` : ''}`,
      ok: 'Desactivar', danger: true,
    });
    if (!ok) return;
  }
  u.activo = !u.activo;
  Store.save();
  toast(u.activo ? 'Cuenta activada.' : 'Cuenta desactivada.', 'info');
  App.refresh();
};
