'use strict';
/* Vista del médico veterinario: agenda (P07–P08), horario y bloqueos (P09, RF10) e historial de pacientes (RF14). */
const Vet = { hor: null, blq: { desde: '', hasta: '', motivo: '' }, q: '', pet: null };
const vetCtx = () => { const u = Session.user(); return { u, v: Q.vetByUser(u.id) }; };

Vet.agenda = () => {
  const { v } = vetCtx();
  App.render(deskShell(Agenda.view({ vetId: v.id }), 'agenda', Agenda.drawer(true)));
};

/* ---------- P09 Horario semanal ---------- */
function horDraft(vetId) {
  const dias = {};
  for (let d = 1; d <= 7; d++) {
    const fr = db.horarios.filter(h => h.id_vet === vetId && h.dia === d).sort(by(h => h.inicio));
    dias[d] = {
      on: fr.length > 0,
      m: fr[0] ? [fr[0].inicio, fr[0].fin] : ['09:00', '13:00'],
      t: fr[1] ? [fr[1].inicio, fr[1].fin] : fr.length ? ['', ''] : ['14:00', '18:00'],
    };
  }
  return { vetId, dias, dirty: false };
}
Vet.horario = () => {
  const { v } = vetCtx();
  if (!Vet.hor || Vet.hor.vetId !== v.id) Vet.hor = horDraft(v.id);
  const H = Vet.hor;
  const rows = [1, 2, 3, 4, 5, 6, 7].map(d => {
    const x = H.dias[d], dia = DIAS_ISO[d].toLowerCase();
    const turno = (k, lbl) => `<div class="turn"><span class="lbl">${lbl}</span>
      <input class="input" type="time" step="1800" value="${x[k][0]}" data-i="horT" data-d="${d}" data-k="${k}" data-j="0" aria-label="${DIAS_ISO[d]}, turno ${lbl.toLowerCase()}: inicio" ${x.on ? '' : 'disabled'}>
      <span class="muted">–</span>
      <input class="input" type="time" step="1800" value="${x[k][1]}" data-i="horT" data-d="${d}" data-k="${k}" data-j="1" aria-label="${DIAS_ISO[d]}, turno ${lbl.toLowerCase()}: fin" ${x.on ? '' : 'disabled'}></div>`;
    return `<div class="hor-row ${x.on ? '' : 'off'}"><b>${DIAS_ISO[d]}</b><button type="button" class="toggle" role="switch" aria-checked="${x.on}" aria-label="Atiende el ${dia}" data-a="horToggle" data-d="${d}"></button>${turno('m', 'Mañana')}${turno('t', 'Tarde')}</div>`;
  }).join('');
  const proximos = db.bloqueos.filter(b => b.id_vet === v.id && ms(b.fin) >= Date.now()).sort(by(b => b.inicio));
  const intervalo = b => (sameDay(b.inicio, b.fin) ? `${fDM(b.inicio)} · ${fTime(b.inicio)}–${fTime(b.fin)}` : `${fDM(b.inicio)} ${fTime(b.inicio)} – ${fDM(b.fin)} ${fTime(b.fin)}`);
  const body = `<div class="d-head"><div><p class="small muted">Define cuándo atiendes; los dueños solo verán horarios libres dentro de estas franjas</p><h1 tabindex="-1">Horario y bloqueos</h1></div></div>
  <div class="cols">
    <section class="card p0" aria-labelledby="hs-t">
      <div class="card-h"><h2 id="hs-t">Horario semanal</h2><div class="row gap8"><span class="chip pend" id="hor-dirty" ${H.dirty ? '' : 'hidden'}>Cambios sin guardar</span><button type="button" class="btn sm pri" data-a="horSave">Guardar cambios</button></div></div>
      <div id="hor-err"></div>
      <div class="hor"><div class="hor-row head"><span>Día</span><span>Atiende</span><span>Turno mañana</span><span>Turno tarde</span></div>${rows}</div>
      <p class="xs muted pad">Deja vacío el turno tarde si solo atiendes en la mañana. El espacio entre los dos turnos aparece como refrigerio en tu agenda.</p>
    </section>
    <div class="list" style="gap:14px">
      <section class="card" aria-labelledby="nb-t"><h2 id="nb-t" class="mb12">Nuevo bloqueo</h2>
        <form data-f="blq" novalidate>
          <div class="row gap8 top wrap"><div class="field grow"><label for="b-d">Desde</label><input class="input" id="b-d" name="desde" type="datetime-local" step="1800" value="${Vet.blq.desde}" data-i="blq"></div>
          <div class="field grow"><label for="b-h">Hasta</label><input class="input" id="b-h" name="hasta" type="datetime-local" step="1800" value="${Vet.blq.hasta}" data-i="blq"></div></div>
          <div class="field"><label for="b-m">Motivo</label><input class="input" id="b-m" name="motivo" list="motivos" maxlength="100" placeholder="Cirugía, permiso, capacitación…" value="${esc(Vet.blq.motivo)}" data-i="blq"></div>
          <datalist id="motivos"><option>Cirugía programada</option><option>Permiso personal</option><option>Capacitación externa</option><option>Refrigerio</option></datalist>
          <div id="blq-note" class="mb12">${blqNote(v.id)}</div>
          <button class="btn pri block">Registrar bloqueo</button>
        </form></section>
      <section class="card p0" aria-labelledby="bp-t"><h2 id="bp-t" class="h3 pad">Bloqueos próximos</h2>
        ${proximos.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Intervalo</th><th>Motivo</th><th><span class="sr">Eliminar</span></th></tr></thead><tbody>${proximos.map(b => `<tr><td>${intervalo(b)}</td><td>${esc(b.motivo || '—')}</td><td class="num"><button type="button" class="iconbtn red" data-a="blqDel" data-id="${b.id}" aria-label="Eliminar bloqueo del ${intervalo(b)}">${ic('x', 16)}</button></td></tr>`).join('')}</tbody></table></div>`
          : '<p class="small muted pad" style="padding-top:0">No tienes bloqueos próximos.</p>'}
      </section>
    </div>
  </div>`;
  App.render(deskShell(body, 'horario'));
};
function marcarCambios() { Vet.hor.dirty = true; document.getElementById('hor-dirty')?.removeAttribute('hidden'); }
ACT.horToggle = el => { const x = Vet.hor.dias[el.dataset.d]; x.on = !x.on; Vet.hor.dirty = true; App.refresh(); };
INPUT.horT = el => { Vet.hor.dias[el.dataset.d][el.dataset.k][+el.dataset.j] = el.value; marcarCambios(); };
ACT.horSave = async () => {
  const { v } = vetCtx(), H = Vet.hor, errs = [], filas = [];
  for (let d = 1; d <= 7; d++) {
    const x = H.dias[d], dia = DIAS_ISO[d];
    if (!x.on) continue;
    const turnos = [x.m, x.t].filter(t => t[0] || t[1]);
    if (!turnos.length) errs.push(`${dia}: indica al menos un turno o desactiva el día.`);
    turnos.forEach(t => {
      if (!t[0] || !t[1]) errs.push(`${dia}: completa la hora de inicio y de fin.`);
      else if (t[1] <= t[0]) errs.push(`${dia}: la hora de fin debe ser posterior a la de inicio.`);
      else filas.push({ id_vet: v.id, dia: d, inicio: t[0], fin: t[1] });
    });
    if (turnos.length === 2 && x.m[1] && x.t[0] && x.t[0] < x.m[1]) errs.push(`${dia}: el turno tarde debe empezar después de que termine el de la mañana.`);
  }
  const box = document.getElementById('hor-err');
  if (errs.length) {
    box.innerHTML = `<div class="note err" style="margin:0 16px 12px" role="alert">${ic('alert', 18)}<span>${errs.map(esc).join('<br>')}</span></div>`;
    return;
  }
  box.innerHTML = '';
  const cabe = c => filas.some(f => f.dia === isoDow(c.inicio) && fTime(c.inicio) >= f.inicio && fTime(c.fin) <= f.fin && sameDay(c.inicio, c.fin));
  const fuera = db.citas.filter(c => c.id_vet === v.id && VIGENTES.includes(c.estado) && ms(c.inicio) > Date.now() && !cabe(c));
  if (fuera.length) {
    const ok = await confirmBox({ title: 'Hay citas fuera del nuevo horario', text: `${plural(fuera.length, 'cita vigente queda', 'citas vigentes quedan')} fuera de las nuevas franjas. Seguirán en tu agenda; coordina con los dueños si es necesario. ¿Guardar de todos modos?`, ok: 'Guardar horario' });
    if (!ok) return;
  }
  removeWhere('horarios', h => h.id_vet === v.id);
  filas.forEach(f => insert('horarios', f));
  Store.save();
  Vet.hor = horDraft(v.id);
  toast('Horario guardado. Los dueños ya ven los nuevos horarios libres.');
  App.refresh();
};

/* ---------- Bloqueos ---------- */
function blqConflictos(vetId) {
  const b = Vet.blq;
  if (!b.desde || !b.hasta) return null;
  const s = new Date(b.desde), e = new Date(b.hasta);
  if (!(ms(e) > ms(s))) return { err: true };
  return { s, e, cs: citasQueCruzan({ vetId, s, e }) };
}
function blqNote(vetId) {
  const r = blqConflictos(vetId);
  if (!r) return `<div class="note info">${ic('info', 18)}<span>Elige desde y hasta cuándo no atenderás; revisaremos si hay citas en ese intervalo.</span></div>`;
  if (r.err) return `<div class="note err">${ic('alert', 18)}<span>La fecha «Hasta» debe ser posterior a «Desde».</span></div>`;
  if (!r.cs.length) return `<div class="note ok">${ic('check', 18)}<span>No hay citas vigentes en este intervalo.</span></div>`;
  return `<div class="note err">${ic('alert', 18)}<span><b>${plural(r.cs.length, 'cita vigente', 'citas vigentes')} en este intervalo:</b> ${r.cs.map(c => `${esc(get('mascotas', c.id_mascota).nombre)} (${fShort(c.inicio)} ${fTime(c.inicio)})`).join(', ')}. Si registras el bloqueo se cancelarán y avisaremos a sus dueños.</span></div>`;
}
INPUT.blq = el => {
  const f = el.form;
  if (el.name === 'desde' && f.desde.value && !f.hasta.value) {
    const h = new Date(ms(f.desde.value) + 2 * HOUR);
    f.hasta.value = `${inDate(h)}T${fTime(h)}`;
  }
  Vet.blq = { desde: f.desde.value, hasta: f.hasta.value, motivo: f.motivo.value };
  document.getElementById('blq-note').innerHTML = blqNote(vetCtx().v.id);
};
SUBMIT.blq = async f => {
  const { u, v } = vetCtx();
  INPUT.blq(f.motivo);
  const errs = {};
  if (!f.desde.value) errs.desde = 'Indica desde cuándo.';
  if (!f.hasta.value) errs.hasta = 'Indica hasta cuándo.';
  else if (f.desde.value && ms(f.hasta.value) <= ms(f.desde.value)) errs.hasta = 'Debe ser posterior a «Desde».';
  if (!setErrors(f, errs)) return;
  const r = blqConflictos(v.id);
  if (r.cs.length) {
    const ok = await confirmBox({ title: `¿Bloquear y cancelar ${plural(r.cs.length, 'cita', 'citas')}?`, text: 'Las citas del intervalo se cancelarán y sus dueños recibirán un aviso para reservar otro horario.', ok: 'Bloquear y cancelar', danger: true });
    if (!ok) return;
    r.cs.forEach(c => cancelar(c.id, u.id, true));
  }
  insert('bloqueos', { id_vet: v.id, inicio: r.s.toISOString(), fin: r.e.toISOString(), motivo: f.motivo.value.trim() });
  Store.save();
  Vet.blq = { desde: '', hasta: '', motivo: '' };
  toast('Bloqueo registrado. Ese intervalo ya no aparece en la reserva.');
  App.refresh();
};
ACT.blqDel = async el => {
  const b = get('bloqueos', el.dataset.id);
  const ok = await confirmBox({ title: '¿Eliminar el bloqueo?', text: `El intervalo del ${fShort(b.inicio)} ${fTime(b.inicio)} volverá a estar disponible para reservas.`, ok: 'Eliminar', danger: true });
  if (!ok) return;
  removeWhere('bloqueos', x => x.id === b.id);
  Store.save();
  toast('Bloqueo eliminado.', 'info');
  App.refresh();
};

/* ---------- Historial de pacientes (RF14) ---------- */
function pacList() {
  const q = norm(Vet.q.trim());
  const rows = db.mascotas.filter(m => m.activo).map(m => {
    const u = Q.owner(m.id).u, cs = Q.citasOfPet(m.id);
    return { m, u, cs, last: cs.find(c => c.estado === 'ATENDIDA') };
  }).filter(x => !q || norm(`${x.m.nombre} ${x.u.nombres} ${x.u.apellidos}`).includes(q))
    .sort(by(x => (x.last ? x.last.inicio : ''), -1));
  if (!rows.length) return `<p class="empty">No encontramos pacientes con «${esc(Vet.q)}».</p>`;
  return `<div class="pac-row head" aria-hidden="true"><span>Mascota</span><span class="hide-s">Dueño/a</span><span class="hide-s">Celular</span><span class="hide-s">Última atención</span><span>Citas</span></div>`
    + rows.map(({ m, u, cs, last }) => `<button type="button" class="pac-row" data-a="pacOpen" data-id="${m.id}" aria-label="${esc(m.nombre)}, de ${esc(u.nombres)} ${esc(u.apellidos)}, ${plural(cs.length, 'cita', 'citas')}">
      <span class="row gap12 min0">${petAv(m, 36)}<span class="min0"><b class="block ellip">${esc(m.nombre)}</b><span class="xs muted block ellip">${esc(especieLbl(m))} · ${esc(m.raza || '—')}</span></span></span>
      <span class="hide-s ellip">${esc(u.nombres)} ${esc(u.apellidos)}</span><span class="hide-s">${esc(u.telefono || '—')}</span>
      <span class="hide-s">${last ? fDate(last.inicio) : '—'}</span><span class="row gap8">${cs.length}${ic('chev', 16)}</span></button>`).join('');
}
function pacDrawer() {
  if (!Vet.pet) return '';
  const m = get('mascotas', Vet.pet), u = Q.owner(m.id).u, cs = Q.citasOfPet(m.id);
  return `<div class="drawer-ov" data-a="pacClose"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-t">
    <div class="row between"><span class="xs muted">Ficha del paciente</span><button type="button" class="back" data-a="pacClose" data-esc aria-label="Cerrar">${ic('x', 18)}</button></div>
    <div class="row gap12">${petAv(m, 56)}<div class="min0"><h2 id="dr-t" tabindex="-1">${esc(m.nombre)}</h2><p class="small muted">${esc([especieLbl(m), m.raza, sexoLbl(m), m.peso ? m.peso + ' kg' : '', edad(m.nacimiento)].filter(Boolean).join(' · '))}</p></div></div>
    <div class="box kv"><div><span>Dueño/a</span><b>${esc(u.nombres)} ${esc(u.apellidos)}</b></div><div><span>Celular</span><b>${esc(u.telefono || '—')}</b></div><div><span>Correo</span><b class="ellip">${esc(u.correo)}</b></div></div>
    <h3>Citas (${cs.length})</h3>
    ${cs.length ? `<div class="list">${cs.map(c => `<div class="card tight"><div class="row between gap8"><b class="small">${fDate(c.inicio)} · ${fTime(c.inicio)}</b>${chip(c.estado)}</div>
      <p class="small muted mt4">${esc(get('servicios', c.id_servicio).nombre)} · ${esc(Q.vetName(c.id_vet, 'mini'))}</p>
      ${c.motivo ? `<p class="small mt4"><span class="muted">Motivo:</span> ${esc(c.motivo)}</p>` : ''}
      ${c.observaciones ? `<p class="small mt4"><span class="muted">Observaciones:</span> ${esc(c.observaciones)}</p>` : ''}</div>`).join('')}</div>` : '<p class="small muted">Aún no tiene citas.</p>'}
  </aside>`;
}
Vet.pacientes = () => {
  const body = `<div class="d-head"><div><p class="small muted">Busca una mascota para ver todas sus citas y observaciones</p><h1 tabindex="-1">Historial de pacientes</h1></div></div>
    <div class="search">${ic('search', 18)}<input class="input" id="pac-q" type="search" placeholder="Buscar por mascota o dueño" aria-label="Buscar paciente por mascota o dueño" value="${esc(Vet.q)}" data-i="pacQ" autocomplete="off"></div>
    <section class="card p0" aria-label="Pacientes"><div id="pac-list">${pacList()}</div></section>`;
  App.render(deskShell(body, 'pacientes', pacDrawer()));
};
INPUT.pacQ = el => { Vet.q = el.value; document.getElementById('pac-list').innerHTML = pacList(); };
ACT.pacOpen = el => { Vet.pet = +el.dataset.id; App.refresh(); document.getElementById('dr-t')?.focus(); };
ACT.pacClose = () => {
  const id = Vet.pet;
  Vet.pet = null;
  App.refresh();
  document.querySelector(`.pac-row[data-id="${id}"]`)?.focus();
};
