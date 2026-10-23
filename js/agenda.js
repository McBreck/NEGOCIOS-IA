'use strict';
/* P07 Agenda semanal/diaria y P08 Detalle de cita (RF11–RF14). La usan el veterinario y el administrador. */
const Agenda = { st: { mode: null, ref: null, sel: null } };
const PH = 72; // píxeles por hora; coincide con --ph en styles.css

const citasDelDia = (vetId, d) => db.citas.filter(c => c.id_vet === vetId && c.estado !== 'CANCELADA' && sameDay(c.inicio, d));
function weekLabel(a, b) {
  return a.getMonth() === b.getMonth()
    ? `Semana del ${a.getDate()} al ${b.getDate()} de ${MESES[b.getMonth()]} de ${b.getFullYear()}`
    : `Semana del ${a.getDate()} de ${MESES[a.getMonth()]} al ${b.getDate()} de ${MESES[b.getMonth()]} de ${b.getFullYear()}`;
}

Agenda.view = ({ vetId, admin = false }) => {
  const A = Agenda.st, hoy = new Date();
  if (!A.mode) A.mode = window.innerWidth < 900 ? 'dia' : 'semana';
  if (!A.ref) A.ref = ms(startOfDay(hoy));
  let days;
  if (A.mode === 'semana') {
    const w = startOfWeek(A.ref);
    days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(w, i)).filter(d => isoDow(d) !== 7 || franjas(vetId, d).length || citasDelDia(vetId, d).length);
  } else days = [startOfDay(A.ref)];
  const f = days[0];
  const sub = A.mode === 'semana' ? weekLabel(f, days[days.length - 1]) : `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
  const hc = citasDelDia(vetId, hoy), cnt = (...e) => hc.filter(c => e.includes(c.estado)).length;
  const detalle = [[cnt('CONFIRMADA'), 'confirmada', 'confirmadas'], [cnt('PENDIENTE', 'REPROGRAMADA'), 'por confirmar', 'por confirmar'], [cnt('ATENDIDA'), 'atendida', 'atendidas']]
    .filter(x => x[0]).map(x => plural(...x)).join(' · ');
  const vetSel = admin ? `<label class="sr" for="ag-vet">Veterinario</label><select id="ag-vet" class="input sm auto" data-i="agVet">${db.veterinarios.map(v => `<option value="${v.id}" ${v.id === vetId ? 'selected' : ''}>${esc(Q.vetName(v.id, 'completo'))}${Q.vetUser(v.id).activo ? '' : ' (inactivo)'}</option>`).join('')}</select>` : '';
  const isDia = A.mode === 'dia';
  return `<div class="d-head"><div><p class="small muted">${sub}</p><h1 tabindex="-1">${isDia ? 'Agenda del día' : 'Agenda semanal'}</h1></div>
    <div class="row gap8 wrap">${vetSel}
      <div class="seg sm" role="group" aria-label="Vista"><button type="button" class="${isDia ? 'on' : ''}" aria-pressed="${isDia}" data-a="agMode" data-m="dia">Día</button><button type="button" class="${isDia ? '' : 'on'}" aria-pressed="${!isDia}" data-a="agMode" data-m="semana">Semana</button></div>
      <button type="button" class="btn sm sec" data-a="agHoy">Hoy</button>
      <button type="button" class="btn sm sec icon" data-a="agMove" data-n="-1" aria-label="${isDia ? 'Día anterior' : 'Semana anterior'}">${ic('back', 18)}</button>
      <button type="button" class="btn sm sec icon" data-a="agMove" data-n="1" aria-label="${isDia ? 'Día siguiente' : 'Semana siguiente'}">${ic('chev', 18)}</button></div></div>
    <div class="ag-bar"><div class="legend">${['PENDIENTE', 'CONFIRMADA', 'REPROGRAMADA', 'ATENDIDA', 'NO_ASISTIO'].map(e => chip(e)).join('')}</div>
      <div class="row gap12 small wrap"><span><b>Hoy:</b> ${plural(hc.length, 'cita', 'citas')}</span>${detalle ? `<span class="muted">${detalle}</span>` : ''}</div></div>
    ${Agenda.grid(vetId, days)}`;
};

Agenda.grid = (vetId, days) => {
  const A = Agenda.st, now = new Date();
  const citas = db.citas.filter(c => c.id_vet === vetId && c.estado !== 'CANCELADA' && days.some(d => sameDay(d, c.inicio)));
  let h0 = 8, h1 = 18;
  days.forEach(d => franjas(vetId, d).forEach(f => { h0 = Math.min(h0, f.s.getHours()); h1 = Math.max(h1, Math.ceil(minDia(f.e) / 60)); }));
  citas.forEach(c => { h0 = Math.min(h0, D(c.inicio).getHours()); h1 = Math.max(h1, Math.ceil(minDia(c.fin) / 60)); });
  h1 = Math.min(Math.max(h1, h0 + 1), 24);
  const H = (h1 - h0) * PH;
  const head = `<div class="ag-head"><div class="ag-gut"></div>${days.map(d => `<div class="ag-dh ${sameDay(d, now) ? 'today' : ''}">${fDow(d)} ${d.getDate()}</div>`).join('')}</div>`;
  let times = '';
  for (let h = h0; h <= h1; h++) times += `<span style="top:${(h - h0) * PH}px">${pad(h)}:00</span>`;
  const cols = days.map(d => {
    const d0 = addMin(startOfDay(d), h0 * 60), d1 = addMin(startOfDay(d), h1 * 60);
    const y = t => (ms(t) - ms(d0)) / MIN * PH / 60;
    const off = (a, b, txt) => (ms(b) > ms(a) ? `<div class="ag-off" style="top:${y(a)}px;height:${y(b) - y(a)}px">${txt}</div>` : '');
    const fr = franjas(vetId, d);
    let fondo = '';
    if (!fr.length) fondo = off(d0, d1, 'No atiende');
    else {
      let cur = d0;
      fr.forEach((f, i) => { fondo += off(cur, f.s, i ? 'Refrigerio' : ''); if (ms(f.e) > ms(cur)) cur = f.e; });
      fondo += off(cur, d1, '');
    }
    const bl = db.bloqueos.filter(b => b.id_vet === vetId && overlap(ms(b.inicio), ms(b.fin), ms(d0), ms(d1))).map(b => {
      const a = Math.max(ms(b.inicio), ms(d0)), z = Math.min(ms(b.fin), ms(d1)), h = y(z) - y(a);
      return `<div class="ag-blk" style="top:${y(a)}px;height:${h - 2}px" title="Bloqueo: ${esc(b.motivo)}">${ic('ban', 13)} Bloqueo${h > 30 && b.motivo ? ': ' + esc(b.motivo) : ''}</div>`;
    }).join('');
    const cs = citas.filter(c => sameDay(c.inicio, d)).map(c => {
      const m = get('mascotas', c.id_mascota), sv = get('servicios', c.id_servicio), o = Q.owner(m.id).u, e = ESTADOS[c.estado];
      const top = y(c.inicio), h = Math.max(y(c.fin) - top - 2, 18), short = h < 34;
      return `<button type="button" class="ag-cita ${e.cls}${short ? ' short' : ''}${A.sel === c.id ? ' sel' : ''}" style="top:${top + 1}px;height:${h}px" data-a="agOpen" data-id="${c.id}" aria-label="${fTime(c.inicio)}, ${esc(m.nombre)}, ${esc(sv.nombre)}, ${e.label}">
        <b>${fTime(c.inicio)} ${esc(m.nombre)}${short ? ` · ${esc(sv.nombre)}` : ''}</b>${short ? '' : `<span>${esc(sv.nombre)} · ${esc(o.nombres[0])}. ${esc(o.apellidos.split(' ')[0])}</span>`}</button>`;
    }).join('');
    const nowLine = ms(now) >= ms(d0) && ms(now) <= ms(d1) ? `<div class="ag-now" style="top:${y(now)}px"></div>` : '';
    return `<div class="ag-col ${sameDay(d, now) ? 'today' : ''}" style="height:${H}px">${fondo}${bl}${cs}${nowLine}</div>`;
  }).join('');
  const minW = days.length > 1 ? ` style="min-width:${56 + days.length * 116}px"` : '';
  return `<div class="ag-scroll" data-ks="ag"><div class="ag"${minW}>${head}<div class="ag-body"><div class="ag-times" style="height:${H}px">${times}</div>${cols}</div></div></div>`;
};

Agenda.drawer = (editable, admin = false) => {
  const A = Agenda.st;
  if (!A.sel) return '';
  const c = get('citas', A.sel);
  if (!c) { A.sel = null; return ''; }
  const m = get('mascotas', c.id_mascota), sv = get('servicios', c.id_servicio), o = Q.owner(m.id).u;
  const vig = VIGENTES.includes(c.estado);
  const recs = Q.recs(c.id).filter(r => r.ref === c.inicio);
  const recTxt = !recs.length ? 'Sin recordatorios' : recs.every(r => r.estado === 'ENVIADO')
    ? (recs.length === 2 ? '24 h y 2 h enviados' : `${recs[0].tipo === 'H24' ? '24 h' : '2 h'} enviado`)
    : recs.map(r => `${r.tipo === 'H24' ? '24 h' : '2 h'} ${r.estado === 'ENVIADO' ? 'enviado' : 'programado'}`).join(' · ');
  const tol = vig && Date.now() > ms(c.inicio) + TOLERANCIA;
  const hist = Q.citasOfPet(m.id).filter(x => x.id !== c.id);
  const obsField = `<div class="field" style="margin:0"><label for="obs">Observaciones de la atención</label><textarea class="input" id="obs" rows="4" maxlength="1000" placeholder="Diagnóstico, tratamiento, próximo control…">${esc(c.observaciones)}</textarea></div>`;
  let acc = '';
  if (editable && vig) {
    acc = `${obsField}<div class="row gap8"><button type="button" class="btn ok grow" data-a="agAtendida" data-id="${c.id}">${ic('check', 18)} Marcar atendida</button><button type="button" class="btn ghost grow" data-a="agNoAsistio" data-id="${c.id}">No asistió</button></div>`;
  } else if (editable && c.estado === 'ATENDIDA') {
    acc = `${obsField}<button type="button" class="btn sec" data-a="agObs" data-id="${c.id}">Guardar observaciones</button>`;
  } else {
    if (c.observaciones) acc = `<div><h3 class="mb8">Observaciones</h3><p class="small">${esc(c.observaciones)}</p></div>`;
    if (!editable && vig) acc += `<div class="note info">${ic('info', 18)}<span>Solo el médico veterinario registra la atención de la cita.</span></div>`;
  }
  return `<div class="drawer-ov" data-a="agClose"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-t">
    <div class="row between">${chip(c.estado)}<button type="button" class="back" data-a="agClose" data-esc aria-label="Cerrar detalle">${ic('x', 18)}</button></div>
    <div class="row gap12">${petAv(m, 56)}<div class="min0"><h2 id="dr-t" tabindex="-1">${esc(m.nombre)}</h2><p class="small muted">${esc([especieLbl(m), m.raza, sexoLbl(m), m.peso ? m.peso + ' kg' : '', edad(m.nacimiento)].filter(Boolean).join(' · '))}</p></div></div>
    <div class="box kv">
      <div><span>Fecha y hora</span><b>${fDow(c.inicio)} ${fDate(c.inicio)} · ${fTime(c.inicio)}–${fTime(c.fin)}</b></div>
      <div><span>Servicio</span><b>${esc(sv.nombre)}</b></div>
      ${admin ? `<div><span>Veterinario</span><b>${esc(Q.vetName(c.id_vet, 'completo'))}</b></div>` : ''}
      <div><span>Dueño/a</span><b>${esc(o.nombres)} ${esc(o.apellidos)}</b></div>
      <div><span>Celular</span><b>${o.telefono ? `<a href="tel:${o.telefono.replace(/\D/g, '')}">${esc(o.telefono)}</a>` : '—'}</b></div>
      <div><span>Motivo</span><b>${esc(c.motivo || '—')}</b></div>
      <div><span>Recordatorios</span><b class="${recs.length && recs.every(r => r.estado === 'ENVIADO') ? 'ok-t' : ''}">${recTxt}</b></div>
    </div>
    ${tol ? `<div class="note warn">${ic('clock', 18)}<span>Pasaron más de 15 minutos desde la hora de inicio. Si la mascota no llegó, marca «No asistió».</span></div>` : ''}
    ${acc}
    <div><h3 class="mb8">Historial de ${esc(m.nombre)}</h3>${hist.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Servicio</th><th>Estado</th></tr></thead><tbody>${hist.map(h => `<tr class="${h.observaciones ? 'has-obs' : ''}"><td>${fDate(h.inicio)}</td><td>${esc(get('servicios', h.id_servicio).nombre)}</td><td>${chip(h.estado)}</td></tr>${h.observaciones ? `<tr class="obs"><td colspan="3">${esc(h.observaciones)}</td></tr>` : ''}`).join('')}</tbody></table></div>` : `<p class="small muted">Es la primera cita de ${esc(m.nombre)}.</p>`}</div>
  </aside>`;
};

Object.assign(ACT, {
  agMode(el) { Agenda.st.mode = el.dataset.m; App.refresh(); },
  agHoy() { Agenda.st.ref = ms(startOfDay(new Date())); App.refresh(); },
  agMove(el) { Agenda.st.ref = ms(addDays(Agenda.st.ref, +el.dataset.n * (Agenda.st.mode === 'dia' ? 1 : 7))); App.refresh(); },
  agOpen(el) { Agenda.st.sel = +el.dataset.id; App.refresh(); document.getElementById('dr-t')?.focus(); },
  agClose() {
    const id = Agenda.st.sel;
    Agenda.st.sel = null;
    App.refresh();
    document.querySelector(`.ag-cita[data-id="${id}"]`)?.focus();
  },
  agAtendida(el) {
    const c = get('citas', el.dataset.id);
    try { registrarAtencion(c.id, 'ATENDIDA', document.getElementById('obs').value, Session.uid()); toast(`Atención de ${get('mascotas', c.id_mascota).nombre} registrada.`); } catch (e) { toast(e.message, 'err'); }
    App.refresh();
  },
  async agNoAsistio(el) {
    const c = get('citas', el.dataset.id), m = get('mascotas', c.id_mascota), obs = document.getElementById('obs').value;
    const ok = await confirmBox({ title: '¿Marcar «No asistió»?', text: `Registrarás que <b>${esc(m.nombre)}</b> no se presentó a la cita de las ${fTime(c.inicio)}. Quedará en el reporte de inasistencias.`, ok: 'Sí, no asistió', danger: true });
    if (!ok) return;
    try { registrarAtencion(c.id, 'NO_ASISTIO', obs, Session.uid()); toast('Inasistencia registrada.', 'info'); } catch (e) { toast(e.message, 'err'); }
    App.refresh();
  },
  agObs(el) { guardarObs(+el.dataset.id, document.getElementById('obs').value); toast('Observaciones guardadas.'); App.refresh(); },
});
