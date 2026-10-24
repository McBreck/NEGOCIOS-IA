'use strict';
/* Vista del dueño de mascota (P03–P06): RF03–RF09 y RF14, diseñada primero para el celular. */
const Owner = { draft: null, rp: null, tab: 'prox' };
const PASOS = ['Mascota', 'Servicio y veterinario', 'Fecha y hora', 'Confirmación'];
const canalTxt = c => (c === 'SMS' ? 'SMS' : 'correo');

function ownerCtx() { const u = Session.user(); return { u, d: Q.duenoByUser(u.id) }; }
function mTop(title, back) {
  const b = !back ? '' : back.startsWith('#')
    ? `<a class="back" href="${back}" aria-label="Volver">${ic('back', 20)}</a>`
    : `<button type="button" class="back" data-a="${back}" aria-label="Volver">${ic('back', 20)}</button>`;
  return `<header class="m-top">${b}<h1 tabindex="-1">${title}</h1></header>`;
}
/* Escritorio: barra lateral y contenido ancho. Celular: barra inferior; en flujos (reserva, chat) se oculta para enfocar la tarea. */
function ownerShell(body, tab, top = '') {
  const { u } = ownerCtx(), n = Q.unread(u.id);
  const items = [['inicio', 'home', 'Inicio'], ['citas', 'list', 'Mis citas'], ['asistente', 'spark', 'Vetty IA'], ['avisos', 'bell', 'Avisos'], ['perfil', 'user', 'Perfil']];
  const flujo = !tab || tab === 'asistente';
  const side = sideNav({ items: items.map(([k, i, l]) => [k, i, l, `#/d/${k}`, k === 'avisos' ? n : 0]), active: tab, u, nombre: `${u.nombres} ${u.apellidos}`, rol: 'Dueño de mascota', cls: 'o-side' });
  const nav = `<nav class="m-nav" aria-label="Navegación principal">${items.map(([k, i, l]) =>
    `<a href="#/d/${k}" class="${k === tab ? 'on' : ''}${k === 'asistente' ? ' ia' : ''}"${k === tab ? ' aria-current="page"' : ''}>${k === 'asistente' ? `<span class="ia-nav">${ic(i, 22)}</span>` : ic(i, 22)}${l}${k === 'avisos' && n ? `<span class="badge">${n}<span class="sr"> sin leer</span></span>` : ''}</a>`).join('')}</nav>`;
  return `<div class="o-shell">${side}<div class="m-app${flujo ? ' is-flow' : ''}${tab === 'asistente' ? ' is-chat' : ''}">${top}<main class="m-content" id="main">${body}</main>${nav}</div></div>`;
}
const proximas = dId => Q.citasOfDueno(dId).filter(c => VIGENTES.includes(c.estado) && ms(c.fin) > Date.now()).sort(by(c => c.inicio));

/* ---------- P03 Inicio ---------- */
Owner.home = () => {
  const { u, d } = ownerCtx();
  const pets = Q.petsOf(d.id), prox = proximas(d.id)[0], unread = Q.unread(u.id);
  const h = new Date().getHours();
  let next;
  if (prox) {
    const m = get('mascotas', prox.id_mascota), sv = get('servicios', prox.id_servicio);
    next = `<section class="next" aria-label="Próxima cita">
      <div class="row between gap8 wrap"><span class="small lt">Próxima cita</span>${prox.estado === 'PENDIENTE' ? chip('PENDIENTE', '● Pendiente de confirmar') : chip(prox.estado)}</div>
      <h2>${esc(m.nombre)} · ${esc(sv.nombre)}</h2>
      <p class="small lt">${esc(Q.vetName(prox.id_vet, 'completo'))}</p>
      <div class="row gap16 wrap small" style="margin:14px 0"><span class="row gap8">${ic('cal', 18)} ${fDow(prox.inicio)} ${fDate(prox.inicio)}</span><span class="row gap8">${ic('clock', 18)} ${fTime(prox.inicio)}</span></div>
      <div class="row gap8">${puedeModificar(prox) ? `<a class="btn sm glass grow" href="#/d/reprogramar/${prox.id}">Reprogramar</a>` : ''}<a class="btn sm white grow" href="#/d/cita/${prox.id}">Ver detalle</a></div>
    </section>`;
  } else {
    next = `<section class="card"><h2 class="h3">No tienes citas próximas</h2><p class="small muted mt4">Reserva en línea a cualquier hora, sin llamar a la clínica.</p></section>`;
  }
  const recs = IA.recomendacionesDueno(d.id);
  const hero = `<section class="ia-hero" aria-labelledby="hero-t">
      <div class="row gap12 top"><span class="vetty lg" aria-hidden="true">${ic('spark', 24)}</span><div class="min0"><h2 id="hero-t">¿Qué necesita tu mascota hoy?</h2>
        <p class="small lt mt4">Cuéntaselo a <b>Vetty</b>, nuestro asistente con IA: evalúa los síntomas, te deriva al especialista y te propone el mejor horario.</p></div></div>
      <a class="ia-ask" href="#/d/asistente">${ic('msg', 18)}<span class="ellip">Ej.: «Mi perro vomitó desde ayer»</span>${ic('send', 18)}</a>
      <div class="qchips light">
        <button type="button" class="qchip" data-a="iaHome" data-f="triage">🩺 Síntoma</button>
        <button type="button" class="qchip" data-a="iaHomeFoto">📷 Foto</button>
        <button type="button" class="qchip" data-a="iaHome" data-f="voz">🎤 Voz</button>
        <button type="button" class="qchip" data-a="iaHome" data-f="prevencion">💉 Vacunas</button>
        <button type="button" class="qchip" data-a="iaHome" data-f="cotizar">💰 Cotizar</button>
      </div>
      <input type="file" id="home-file" accept="image/*" hidden data-i="iaFoto">
    </section>`;
  const recHtml = recs.length ? `<div class="sec-h"><h2 class="h3 row gap8">${ic('spark', 16)} Recomendado por IA</h2><span class="xs muted">según su historial</span></div>
    <div class="list">${recs.map(r => { const m = get('mascotas', r.petId); return `<article class="card rec"><div class="row gap12 top">${petAv(m, 40)}<div class="grow min0"><p class="xs muted">${esc(m.nombre)}</p><h3>${esc(r.titulo)}</h3><p class="small muted mt4">${esc(r.texto)}</p></div></div>
      <button type="button" class="btn sm sec block mt12" data-a="recVer" data-k="${r.key}">${ic('cal', 16)} Ver horarios sugeridos</button></article>`; }).join('')}</div>` : '';
  const mascotas = `<div class="sec-h"><h2 class="h3">Mis mascotas</h2><button type="button" class="btn link" data-a="petNew">+ Agregar</button></div>
    ${pets.length ? `<div class="list">${pets.map(m => `<a class="card pet-card" href="#/d/mascota/${m.id}">${petAv(m)}<span class="grow min0"><b class="block">${esc(m.nombre)}</b><span class="small muted block ellip">${esc(petLine(m))}</span></span><span class="xs muted">${plural(Q.citasOfPet(m.id).length, 'cita', 'citas')}</span>${ic('chev', 18)}</a>`).join('')}</div>`
      : `<div class="card empty"><div class="big">🐾</div><p>Registra a tu mascota para poder reservar una cita.</p><button type="button" class="btn pri mt12" data-a="petNew">Agregar mascota</button></div>`}`;
  const body = `
    <div class="hello"><div><p class="small muted">${h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'}</p><h1 tabindex="-1">Hola, ${esc(u.nombres.split(' ')[0])}</h1></div>
      <a class="avatar me hide-d" href="#/d/perfil" aria-label="Mi perfil">${esc(iniciales(u))}</a></div>
    <div class="o-grid">
      <div class="o-col">
        ${hero}
        ${unread ? `<a class="note info" href="#/d/avisos">${ic('bell', 18)}<span>Tienes ${plural(unread, 'aviso sin leer', 'avisos sin leer')}. <b>Revisar</b></span></a>` : ''}
        ${next}
        <button type="button" class="btn sec block" data-a="nuevaReserva">${ic('cal', 18)} Reservar sin asistente</button>
      </div>
      <div class="o-col">${recHtml}${mascotas}</div>
    </div>`;
  App.render(ownerShell(body, 'inicio'));
};
function recDe(key) { return IA.recomendacionesDueno(ownerCtx().d.id).find(r => r.key === key); }
function recModal(r) {
  const { u } = ownerCtx(), m = get('mascotas', r.petId), ofs = IA.ofertasRecomendacion(r);
  return `${modalHead(`${esc(r.titulo)} · ${esc(m.nombre)}`)}
    <p class="small">Hola, ${esc(u.nombres.split(' ')[0])}. ${esc(r.texto)} ${ofs.length ? `Tengo estos horarios libres con ${esc([...new Set(ofs.map(id => Q.vetName(IA.ofertas.get(id).vetId)))].join(' o '))}, ¿cuál te queda mejor?` : 'No encontré horarios libres pronto; llama a la clínica.'}</p>
    ${ofs.length ? ofertasHtml(ofs) : ''}
    <button type="button" class="btn link mt8" data-a="recManual" data-k="${r.key}">Prefiero elegir otro horario</button>`;
}
ACT.recVer = el => { const r = recDe(el.dataset.k); if (r) openModal(recModal(r)); else { toast('Esta recomendación ya está agendada.', 'info'); App.refresh(); } };
ACT.recManual = el => {
  const r = recDe(el.dataset.k);
  if (!r) return;
  const sv = IA.servicio(r.servicio);
  Owner.draft = nuevoDraft({ step: 3, petId: r.petId, servicioId: sv.id, vetId: r.vetId || 0, motivo: r.titulo, ia: { origen: 'recomendacion', urgencia: 'normal', area: r.area, servicio: sv.nombre, sintomas: [], respuestas: {}, fotos: [], voz: '', resumen: `Propuesta por el asistente IA a partir del historial: ${r.titulo.toLowerCase()}. ${r.texto}` } });
  closeModal();
  go('#/d/reservar');
};

/* ---------- Mascotas (RF03, RF14) ---------- */
function petForm(m) {
  const x = m || { nombre: '', especie: 'Perro', raza: '', sexo: '', nacimiento: '', peso: '' };
  return `${modalHead(m ? 'Editar mascota' : 'Nueva mascota')}
  <form data-f="pet" data-id="${m ? m.id : ''}" novalidate>
    <div class="field"><label for="p-n">Nombre</label><input class="input" id="p-n" name="nombre" maxlength="40" autocomplete="off" value="${esc(x.nombre)}"></div>
    <div class="row gap8 top">
      <div class="field grow"><label for="p-e">Especie</label><select class="input" id="p-e" name="especie">${['Perro', 'Gato', 'Otra'].map(e => `<option ${x.especie === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
      <div class="field grow"><label for="p-r">Raza (opcional)</label><input class="input" id="p-r" name="raza" maxlength="40" value="${esc(x.raza)}"></div>
    </div>
    <fieldset class="field"><legend>Sexo</legend><div class="row gap8">
      <label class="opt"><input type="radio" name="sexo" value="M" ${x.sexo === 'M' ? 'checked' : ''}> Macho</label>
      <label class="opt"><input type="radio" name="sexo" value="H" ${x.sexo === 'H' ? 'checked' : ''}> Hembra</label></div></fieldset>
    <div class="row gap8 top">
      <div class="field grow"><label for="p-f">Nacimiento (aprox.)</label><input class="input" id="p-f" name="nacimiento" type="date" max="${inDate(new Date())}" value="${esc(x.nacimiento)}"></div>
      <div class="field grow"><label for="p-w">Peso (kg)</label><input class="input" id="p-w" name="peso" type="number" min="0.1" step="0.1" inputmode="decimal" value="${x.peso ?? ''}"></div>
    </div>
    <button class="btn pri block">${m ? 'Guardar cambios' : 'Agregar mascota'}</button>
    ${m ? `<button type="button" class="btn link red block mt8" data-a="petOff" data-id="${m.id}">Dar de baja a ${esc(m.nombre)}</button>` : ''}
  </form>`;
}
ACT.petNew = () => openModal(petForm(null));
ACT.petEdit = el => openModal(petForm(get('mascotas', el.dataset.id)));
SUBMIT.pet = f => {
  const { d } = ownerCtx(), id = Number(f.dataset.id) || null;
  const nombre = f.nombre.value.trim(), peso = f.peso.value === '' ? null : Number(f.peso.value), nac = f.nacimiento.value;
  const errs = {};
  if (!nombre) errs.nombre = 'Escribe el nombre de tu mascota.';
  if (peso !== null && !(peso > 0 && peso < 200)) errs.peso = 'El peso debe ser mayor que 0.';
  if (nac && parseDate(nac) > new Date()) errs.nacimiento = 'La fecha no puede ser futura.';
  if (!setErrors(f, errs)) return;
  const data = { nombre, especie: f.especie.value, raza: f.raza.value.trim(), sexo: f.sexo.value || '', nacimiento: nac, peso: peso === null ? null : Math.round(peso * 100) / 100 };
  if (id) Object.assign(get('mascotas', id), data);
  else {
    const m = insert('mascotas', { id_dueno: d.id, ...data, activo: true });
    if (Owner.draft && !Owner.draft.done && Owner.draft.step === 1) Owner.draft.petId = m.id;
  }
  Store.save();
  closeModal();
  toast(id ? 'Datos de la mascota actualizados.' : `Listo, agregamos a ${nombre}.`);
  App.refresh();
};
ACT.petOff = async el => {
  const m = get('mascotas', el.dataset.id);
  const vig = Q.citasOfPet(m.id).filter(c => VIGENTES.includes(c.estado) && ms(c.fin) > Date.now());
  if (vig.length) { toast(`${m.nombre} tiene ${plural(vig.length, 'cita vigente', 'citas vigentes')}. Cancélalas antes de darla de baja.`, 'err'); return; }
  const ok = await confirmBox({ title: `¿Dar de baja a ${m.nombre}?`, text: 'Ya no aparecerá en tus mascotas ni podrás reservarle citas. Su historial se conserva en la clínica.', ok: 'Sí, dar de baja', danger: true });
  if (!ok) return;
  m.activo = false;
  Store.save();
  toast(`${m.nombre} fue dada de baja.`, 'info');
  go('#/d/inicio');
};

function histItem(c) {
  const sv = get('servicios', c.id_servicio);
  return `<a class="card cita-main" href="#/d/cita/${c.id}"><div class="row between gap8"><b>${fLong(c.inicio)}</b>${chip(c.estado)}</div>
    <p class="small muted mt4">${esc(sv.nombre)} · ${fTime(c.inicio)} · ${esc(Q.vetName(c.id_vet, 'mini'))}</p>
    ${c.observaciones && c.estado === 'ATENDIDA' ? `<p class="small mt8"><span class="muted">Indicaciones:</span> ${esc(c.observaciones)}</p>` : ''}</a>`;
}
Owner.mascota = id => {
  const { d } = ownerCtx(), m = get('mascotas', id);
  if (!m || m.id_dueno !== d.id || !m.activo) return go('#/d/inicio', true);
  const cs = Q.citasOfPet(m.id);
  const body = `<div class="card"><div class="row gap12">${petAv(m, 56)}<div class="grow min0"><h2>${esc(m.nombre)}</h2><p class="small muted">${esc(petLine(m))}</p></div></div>
      <div class="kv mt12"><div><span>Sexo</span><b>${sexoLbl(m) || '—'}</b></div><div><span>Edad</span><b>${edad(m.nacimiento) || '—'}</b></div><div><span>Peso</span><b>${m.peso ? m.peso + ' kg' : '—'}</b></div></div>
      <div class="row gap8 mt12"><button type="button" class="btn sm sec grow" data-a="petEdit" data-id="${m.id}">${ic('edit', 16)} Editar</button><button type="button" class="btn sm pri grow" data-a="reservarPara" data-id="${m.id}">${ic('plus', 16)} Reservar cita</button></div></div>
    <div class="sec-h"><h2 class="h3">Historial de citas</h2><span class="xs muted">${plural(cs.length, 'cita', 'citas')}</span></div>
    ${cs.length ? `<div class="list">${cs.map(histItem).join('')}</div>` : `<div class="card empty">${esc(m.nombre)} aún no tiene citas.</div>`}`;
  App.render(ownerShell(body, 'inicio', mTop('Ficha de mascota', '#/d/inicio')));
};

/* ---------- Selector de fecha y hora (compartido por reserva y reprogramación) ---------- */
function picker(st, p, { servicioId, vetId, petId, excluir, actual, calma }) {
  const vetIds = vetId ? [vetId] : Q.vetsActivos().map(v => v.id);
  const hoy = startOfDay(new Date()), dias = [];
  for (let i = 0; i < 21; i++) {
    const day = addDays(hoy, i), sl = horariosDelDia({ day, servicioId, vetId, petId, excluir });
    sl.forEach(x => { if (ms(x.inicio) === actual) x.libre = false; });
    dias.push({ day, sl, libres: sl.filter(x => x.libre).length, atiende: vetIds.some(v => franjas(v, day).length) });
  }
  if (!dias.some(x => ms(x.day) === st.day && x.libres)) {
    const f = dias.find(x => x.libres);
    st.day = f ? ms(f.day) : ms(hoy);
    st.inicio = null;
  }
  const cur = dias.find(x => ms(x.day) === st.day);
  if (st.inicio && !cur.sl.some(x => x.libre && ms(x.inicio) === st.inicio)) st.inicio = null;
  App.after.push(() => {
    const strip = document.querySelector('.days');
    if (strip && !strip.dataset.restored) { const on = strip.querySelector('.on'); if (on) strip.scrollLeft = on.offsetLeft - 8; }
  });
  return `<div class="row between mb8"><h3>${fMonthYear(st.day)}</h3><span class="xs muted">Próximas 3 semanas</span></div>
    <div class="days" data-ks="days-${p}" role="group" aria-label="Elige la fecha">${dias.map(x => {
      const on = ms(x.day) === st.day;
      return `<button type="button" class="day ${on ? 'on' : ''}" data-a="pickDay" data-p="${p}" data-d="${ms(x.day)}" aria-pressed="${on}" ${x.libres ? '' : 'disabled'} aria-label="${fLong(x.day)}: ${x.libres ? plural(x.libres, 'horario libre', 'horarios libres') : x.atiende ? 'sin horarios libres' : 'no hay atención'}"><span class="xs">${sameDay(x.day, hoy) ? 'Hoy' : fDow(x.day)}</span><b>${x.day.getDate()}</b><span class="xxs">${x.libres ? x.libres + ' libres' : x.atiende ? 'Lleno' : 'Cerrado'}</span></button>`;
    }).join('')}</div>
    <div class="row between mt16 mb8"><h3>Horarios disponibles</h3><span class="xs muted">${plural(cur.libres, 'libre', 'libres')}</span></div>
    ${cur.sl.length ? `<div class="slots" role="group" aria-label="Elige la hora">${cur.sl.map(x => {
      const on = ms(x.inicio) === st.inicio, t = fTime(x.inicio), tranq = calma && x.libre && IA.tranquilidad(x.inicio, get('servicios', servicioId).duracion) === 0;
      return `<button type="button" class="slot ${on ? 'on' : ''}${tranq ? ' calm' : ''}" data-a="pickSlot" data-p="${p}" data-t="${ms(x.inicio)}" aria-pressed="${on}" ${x.libre ? (tranq ? `aria-label="${t}, horario tranquilo"` : '') : `disabled aria-label="${t} ${ms(x.inicio) === actual ? 'horario actual' : 'ocupado'}"`}>${t}</button>`;
    }).join('')}</div><p class="xs muted mt8">Las horas tachadas ya están ocupadas.${calma ? ' <span class="calm-leg">🌿 Sugerencia IA: horarios tranquilos, con pocos perros en la sala de espera.</span>' : ''}</p>` : '<div class="card empty">No hay horarios este día.</div>'}`;
}
const pickState = p => (p === 'rp' ? Owner.rp : Owner.draft);
ACT.pickDay = el => { const st = pickState(el.dataset.p); st.day = +el.dataset.d; st.inicio = null; App.refresh(); };
ACT.pickSlot = el => { pickState(el.dataset.p).inicio = +el.dataset.t; App.refresh(); };

/* ---------- P04 Reservar cita en 4 pasos (RF04, RF05) ---------- */
const nuevoDraft = (o = {}) => ({ step: 1, petId: null, servicioId: null, vetId: 0, day: null, inicio: null, motivo: '', vetAsig: null, done: null, ia: null, ...o });
Owner.reservar = () => {
  const { d } = ownerCtx();
  const st = Owner.draft || (Owner.draft = nuevoDraft());
  if (st.done) return Owner.reservaOk();
  const pets = Q.petsOf(d.id);
  if (st.petId && !pets.some(p => p.id === st.petId)) { st.petId = null; st.step = 1; }
  if (st.servicioId && !get('servicios', st.servicioId)?.activo) { st.servicioId = null; if (st.step > 2) st.step = 2; }
  let body = '', cta = '';
  if (st.step === 1) {
    body = `<h2 class="mb12">¿Para qué mascota es la cita?</h2>` + (pets.length
      ? `<div class="list" role="radiogroup" aria-label="Mascota">${pets.map(m => optCard({ on: st.petId === m.id, a: 'rsPet', id: m.id, lead: petAv(m), title: m.nombre, sub: petLine(m) })).join('')}</div>
         <button type="button" class="btn link mt8" data-a="petNew">+ Agregar otra mascota</button>`
      : `<div class="card empty"><div class="big">🐾</div><p>Primero registra a tu mascota.</p><button type="button" class="btn pri mt12" data-a="petNew">Agregar mascota</button></div>`);
    cta = `<button type="button" class="btn pri block" data-a="rsNext" ${st.petId ? '' : 'disabled'}>Continuar</button>`;
  } else if (st.step === 2) {
    body = `<a class="note ai mb16" href="#/d/asistente">${ic('spark', 18)}<span>¿No sabes qué servicio elegir? <b>Cuéntale los síntomas a Vetty</b> y te deriva al especialista adecuado.</span></a>
      <h2 class="mb12">¿Qué servicio necesitas?</h2>
      <div class="list" role="radiogroup" aria-label="Servicio">${db.servicios.filter(s => s.activo).map(s => optCard({ on: st.servicioId === s.id, a: 'rsSvc', id: s.id, title: s.nombre, sub: `${s.duracion} min · ${money(s.precio)} referencial` })).join('')}</div>
      <h2 class="mt24 mb12">¿Con qué veterinario?</h2>
      <div class="list" role="radiogroup" aria-label="Veterinario">
        ${optCard({ on: st.vetId === 0, a: 'rsVet', id: 0, lead: `<span class="avatar" style="background:var(--ok-bg);color:var(--ok)">${ic('users', 22)}</span>`, title: 'Cualquiera disponible', sub: 'Verás más horarios libres' })}
        ${Q.vetsActivos().map(v => optCard({ on: st.vetId === v.id, a: 'rsVet', id: v.id, lead: `<span class="avatar" style="background:var(--sky);color:var(--navy);font-size:15px">${esc(iniciales(Q.vetUser(v.id)))}</span>`, title: Q.vetName(v.id, 'completo'), sub: v.especialidad })).join('')}
      </div>`;
    cta = `<button type="button" class="btn pri block" data-a="rsNext" ${st.servicioId ? '' : 'disabled'}>${st.servicioId ? 'Continuar' : 'Elige un servicio para continuar'}</button>`;
  } else if (st.step === 3) {
    const sv = get('servicios', st.servicioId), m = get('mascotas', st.petId);
    body = `${st.ia ? `<div class="note ai mb12">${ic('spark', 18)}<span>Propuesta del asistente IA. El veterinario recibirá el resumen de lo que contaste.</span></div>` : ''}<div class="card mb16 tight"><div class="kv sm">
        <div><span>Mascota</span><b>${esc(m.nombre)}</b></div><div><span>Servicio</span><b>${esc(sv.nombre)} · ${sv.duracion} min</b></div>
        <div><span>Veterinario</span><b>${st.vetId ? esc(Q.vetName(st.vetId)) : 'Cualquiera disponible'}</b></div></div></div>
      ${picker(st, 'rs', { servicioId: sv.id, vetId: st.vetId || null, petId: m.id, calma: m.especie === 'Gato' })}
      <div class="field mt16"><label for="rs-mot">Motivo de la consulta (opcional)</label><textarea class="input" id="rs-mot" rows="2" maxlength="200" data-i="rsMotivo" placeholder="Ej.: control anual, no quiere comer desde ayer…">${esc(st.motivo)}</textarea></div>`;
    cta = `<button type="button" class="btn pri block" data-a="rsNext" ${st.inicio ? '' : 'disabled'}>${st.inicio ? `Continuar · ${fShort(st.inicio)} a las ${fTime(st.inicio)}` : 'Elige un horario para continuar'}</button>`;
  } else {
    const sv = get('servicios', st.servicioId), m = get('mascotas', st.petId);
    body = `<h2 class="mb12">Revisa y confirma tu cita</h2>
      <div class="card"><div class="row gap12 mb12">${petAv(m)}<div class="min0"><h3>${esc(m.nombre)}</h3><p class="small muted">${esc(petLine(m))}</p></div></div>
        <div class="kv"><div><span>Servicio</span><b>${esc(sv.nombre)}</b></div><div><span>Fecha</span><b>${fLong(st.inicio)}</b></div>
        <div><span>Hora</span><b>${fTime(st.inicio)} – ${fTime(addMin(st.inicio, sv.duracion))}</b></div>
        <div><span>Veterinario</span><b>${esc(Q.vetName(st.vetId || st.vetAsig, 'completo'))}</b></div>
        <div><span>Motivo</span><span>${esc(st.motivo.trim() || '—')}</span></div></div>
        <button type="button" class="btn link mt4" data-a="rsGo" data-s="3">Cambiar fecha u hora</button></div>
      <div class="note info mt12">${ic('bell', 18)}<span>Te enviaremos la confirmación y recordatorios 24 h y 2 h antes por <b>${canalTxt(d.canal)}</b>. Puedes reprogramar o cancelar hasta 2 horas antes.</span></div>`;
    cta = `<button type="button" class="btn ok block" data-a="rsConfirm">${ic('check', 18)} Confirmar reserva</button>`;
  }
  const progress = `<div class="progress" aria-hidden="true">${PASOS.map((_, i) => `<i class="${i < st.step ? 'on' : ''}"></i>`).join('')}</div>
    <p class="xs muted mb16">Paso ${st.step} de 4 · ${PASOS[st.step - 1]}</p>`;
  App.render(ownerShell(progress + body + `<div class="cta">${cta}</div>`, null, mTop('Reservar cita', 'rsBack')));
};
Owner.reservaOk = () => {
  const { d } = ownerCtx(), c = get('citas', Owner.draft.done);
  const m = get('mascotas', c.id_mascota), sv = get('servicios', c.id_servicio);
  App.render(ownerShell(`<div class="success"><div class="big-ok">${ic('check', 36)}</div><h1 tabindex="-1">¡Cita reservada!</h1>
      <p class="muted mt8">Te enviamos la confirmación por ${canalTxt(d.canal)}.</p></div>
    <div class="card mt24"><div class="row between gap8 mb12"><h3>${esc(m.nombre)} · ${esc(sv.nombre)}</h3>${chip(c.estado)}</div>
      <div class="kv"><div><span>Fecha</span><b>${fLong(c.inicio)}</b></div><div><span>Hora</span><b>${fTime(c.inicio)} – ${fTime(c.fin)}</b></div><div><span>Veterinario</span><b>${esc(Q.vetName(c.id_vet, 'completo'))}</b></div></div></div>
    <div class="note info mt12">${ic('bell', 18)}<span>Confirma tu asistencia desde el recordatorio que te llegará antes de la cita.</span></div>
    <a class="btn pri block mt24" href="#/d/citas">Ver mis citas</a><a class="btn sec block mt8" href="#/d/inicio">Volver al inicio</a>`, null));
};
Object.assign(ACT, {
  nuevaReserva() { Owner.draft = null; go('#/d/reservar'); },
  reservarPara(el) { Owner.draft = nuevoDraft({ petId: +el.dataset.id, step: 2 }); go('#/d/reservar'); },
  rsBack() {
    const st = Owner.draft;
    if (st && st.step > 1 && !st.done) { st.step--; App.refresh(); window.scrollTo(0, 0); } else go('#/d/inicio');
  },
  rsPet(el) { Owner.draft.petId = +el.dataset.id; Owner.draft.inicio = null; App.refresh(); },
  rsSvc(el) { Owner.draft.servicioId = +el.dataset.id; Owner.draft.inicio = null; App.refresh(); },
  rsVet(el) { Object.assign(Owner.draft, { vetId: +el.dataset.id, inicio: null, day: null }); App.refresh(); },
  rsGo(el) { Owner.draft.step = +el.dataset.s; App.refresh(); window.scrollTo(0, 0); },
  rsNext() {
    const st = Owner.draft;
    if (st.step === 3) {
      const sl = horariosDelDia({ day: startOfDay(st.inicio), servicioId: st.servicioId, vetId: st.vetId || null, petId: st.petId }).find(x => ms(x.inicio) === st.inicio);
      if (!sl || !sl.libre) { toast('Ese horario ya no está disponible. Elige otro, por favor.', 'err'); st.inicio = null; return App.refresh(); }
      st.vetAsig = st.vetId || elegirVet(sl.vets, st.inicio);
    }
    st.step++;
    App.refresh();
    window.scrollTo(0, 0);
  },
  rsConfirm() {
    const st = Owner.draft;
    try {
      const c = reservar({ petId: st.petId, servicioId: st.servicioId, vetId: st.vetId || st.vetAsig, inicio: st.inicio, motivo: st.motivo.trim(), uid: Session.uid(), ia: st.ia });
      st.done = c.id;
    } catch (e) {
      toast(e.message, 'err');
      st.step = 3;
      st.inicio = null;
    }
    App.refresh();
    window.scrollTo(0, 0);
  },
});
INPUT.rsMotivo = el => { Owner.draft.motivo = el.value; };

/* ---------- P05 Mis citas (RF06, RF07) ---------- */
function citaCard(c, acciones) {
  const m = get('mascotas', c.id_mascota), sv = get('servicios', c.id_servicio);
  let acts = '';
  if (acciones) {
    acts = puedeModificar(c)
      ? `<div class="row gap8 mt12"><a class="btn sm sec grow" href="#/d/reprogramar/${c.id}">${ic('cal', 16)} Reprogramar</a><button type="button" class="btn sm ghost grow" data-a="cancelCita" data-id="${c.id}">${ic('x', 16)} Cancelar</button></div>`
      : `<p class="xs muted mt12 row gap8">${ic('info', 14)} Faltan menos de 2 horas: ya no se puede reprogramar ni cancelar en línea.</p>`;
  }
  return `<article class="card cita"><a class="cita-main" href="#/d/cita/${c.id}" aria-label="Ver detalle de la cita de ${esc(m.nombre)}">
      <div class="row gap12">${petAv(m)}<div class="grow min0"><div class="row between gap8"><h3>${esc(m.nombre)}</h3>${chip(c.estado)}</div><p class="small muted">${esc(sv.nombre)} · ${sv.duracion} min</p></div></div>
      <div class="meta small"><span>${ic('cal', 16)}${fShort(c.inicio)}</span><span>${ic('clock', 16)}${fTime(c.inicio)}</span><span class="muted">${esc(Q.vetName(c.id_vet, 'mini'))}</span></div></a>${acts}</article>`;
}
Owner.citas = () => {
  const { d } = ownerCtx(), prox = proximas(d.id);
  const hist = Q.citasOfDueno(d.id).filter(c => !prox.includes(c)).sort(by(c => c.inicio, -1));
  const t = Owner.tab, list = t === 'prox' ? prox : hist;
  const body = `<div class="seg mb16" role="tablist" aria-label="Citas">
      <button type="button" role="tab" aria-selected="${t === 'prox'}" class="${t === 'prox' ? 'on' : ''}" data-a="citasTab" data-t="prox">Próximas (${prox.length})</button>
      <button type="button" role="tab" aria-selected="${t === 'hist'}" class="${t === 'hist' ? 'on' : ''}" data-a="citasTab" data-t="hist">Historial (${hist.length})</button></div>
    ${list.length ? `<div class="list">${list.map(c => citaCard(c, t === 'prox')).join('')}</div>`
      : t === 'prox' ? `<div class="card empty"><div class="big">📅</div><p>No tienes citas próximas.</p><button type="button" class="btn pri mt12" data-a="nuevaReserva">Reservar cita</button></div>`
        : '<div class="card empty">Aún no tienes citas pasadas.</div>'}
    ${t === 'prox' && prox.length ? `<div class="note info mt16">${ic('clock', 18)}<span>Puedes reprogramar o cancelar hasta 2 horas antes. Te recordaremos tu cita 24 h y 2 h antes por ${canalTxt(d.canal)}.</span></div>` : ''}`;
  App.render(ownerShell(body, 'citas', mTop('Mis citas')));
};
ACT.citasTab = el => { Owner.tab = el.dataset.t; App.refresh(); };
ACT.cancelCita = async el => {
  const c = get('citas', el.dataset.id), m = get('mascotas', c.id_mascota);
  const ok = await confirmBox({
    title: '¿Cancelar la cita?',
    text: `La cita de <b>${esc(m.nombre)}</b> del ${fLong(c.inicio)} a las ${fTime(c.inicio)} se cancelará y el horario quedará libre para otra persona.`,
    ok: 'Sí, cancelar cita', cancel: 'No, mantenerla', danger: true,
  });
  if (!ok) return;
  try { cancelar(c.id, Session.uid()); toast('Cita cancelada. Te enviamos la confirmación.'); } catch (e) { toast(e.message, 'err'); }
  App.refresh();
};
ACT.confirmTk = el => {
  const r = confirmarToken(el.dataset.tk, Session.uid());
  if (r.ok) toast('¡Gracias! Confirmaste tu asistencia.'); else toast(r.msg, 'err');
  App.refresh();
};

/* ---------- Detalle de una cita ---------- */
function recLines(c) {
  const rs = Q.recs(c.id).filter(r => r.ref === c.inicio);
  if (!rs.length) return '<p class="small muted">No hay recordatorios programados (la cita es muy pronto).</p>';
  return rs.map(r => `<div><span>${r.tipo === 'H24' ? '24 horas antes' : '2 horas antes'}</span><span>${r.estado === 'ENVIADO'
    ? `<b class="ok-t">Enviado</b> ${fDM(r.enviado)} ${fTime(r.enviado)}` : `Programado ${fDM(r.programado)} ${fTime(r.programado)}`} · ${canalTxt(r.canal)}</span></div>`).join('');
}
Owner.cita = id => {
  const { d } = ownerCtx(), c = get('citas', id);
  if (!c || !Q.citasOfDueno(d.id).includes(c)) return go('#/d/citas', true);
  const m = get('mascotas', c.id_mascota), sv = get('servicios', c.id_servicio);
  const vig = VIGENTES.includes(c.estado) && ms(c.fin) > Date.now();
  const rec = Q.recs(c.id).filter(r => r.ref === c.inicio && r.estado === 'ENVIADO' && !r.usado).pop();
  let acc = '';
  if (vig) {
    if (c.estado !== 'CONFIRMADA') {
      acc += rec ? `<button type="button" class="btn ok block" data-a="confirmTk" data-tk="${rec.token}">${ic('check', 18)} Confirmar asistencia</button>`
        : `<div class="note info">${ic('bell', 18)}<span>Podrás confirmar tu asistencia desde el recordatorio que te enviaremos antes de la cita.</span></div>`;
    }
    acc += puedeModificar(c)
      ? `<div class="row gap8 mt8"><a class="btn sec grow" href="#/d/reprogramar/${c.id}">${ic('cal', 18)} Reprogramar</a><button type="button" class="btn ghost grow" data-a="cancelCita" data-id="${c.id}">${ic('x', 18)} Cancelar</button></div>`
      : `<div class="note warn mt8">${ic('alert', 18)}<span>Faltan menos de 2 horas: ya no puedes reprogramar ni cancelar en línea. Llama a la clínica si lo necesitas.</span></div>`;
  }
  const hist = Q.historial(c.id).map(h => `<li><p class="small"><b>${h.estado_anterior ? ESTADOS[h.estado_anterior].label + ' → ' : ''}${ESTADOS[h.estado_nuevo].label}</b></p>
    <p class="xs muted">${fDateTime(h.fecha)} · ${esc(h.comentario || '')}${h.inicio_anterior ? ` · antes: ${fShort(h.inicio_anterior)} ${fTime(h.inicio_anterior)}` : ''}</p></li>`).join('');
  const body = `<div class="card"><div class="row gap12">${petAv(m, 52)}<div class="grow min0"><h2>${esc(m.nombre)}</h2><p class="small muted">${esc(sv.nombre)} · ${sv.duracion} min</p></div>${chip(c.estado)}</div>
      <div class="kv mt12"><div><span>Fecha</span><b>${fLong(c.inicio)}</b></div><div><span>Hora</span><b>${fTime(c.inicio)} – ${fTime(c.fin)}</b></div>
      <div><span>Veterinario</span><b>${esc(Q.vetName(c.id_vet, 'completo'))}</b></div><div><span>Motivo</span><span>${esc(c.motivo || '—')}</span></div></div></div>
    ${acc ? `<div class="mt12">${acc}</div>` : ''}
    ${c.estado === 'ATENDIDA' && c.observaciones ? `<div class="sec-h"><h2 class="h3">Indicaciones del veterinario</h2></div><div class="card small">${esc(c.observaciones)}</div>` : ''}
    ${c.ia ? `<div class="mt16">${iaCard(c.ia)}</div>` : ''}
    ${vig ? `<div class="sec-h"><h2 class="h3">Recordatorios</h2></div><div class="card kv">${recLines(c)}</div>` : ''}
    <div class="sec-h"><h2 class="h3">Historial de cambios</h2></div><div class="card"><ol class="timeline">${hist}</ol></div>`;
  App.render(ownerShell(body, 'citas', mTop('Detalle de la cita', '#/d/citas')));
};

/* ---------- Reprogramar (RF06) ---------- */
Owner.reprogramar = id => {
  const { d } = ownerCtx(), c = get('citas', id);
  if (!c || !Q.citasOfDueno(d.id).includes(c)) return go('#/d/citas', true);
  const m = get('mascotas', c.id_mascota), sv = get('servicios', c.id_servicio);
  if (!Owner.rp || Owner.rp.citaId !== c.id) Owner.rp = { citaId: c.id, day: ms(startOfDay(c.inicio)), inicio: null };
  const st = Owner.rp;
  let body = `<div class="card mb16 tight"><p class="xs muted mb8">Cita actual</p><div class="row gap12">${petAv(m)}<div class="grow min0"><h3>${esc(m.nombre)} · ${esc(sv.nombre)}</h3>
    <p class="small muted">${fShort(c.inicio)} · ${fTime(c.inicio)} · ${esc(Q.vetName(c.id_vet))}</p></div>${chip(c.estado)}</div></div>`;
  let cta = '';
  if (!puedeModificar(c)) {
    body += `<div class="note warn">${ic('alert', 18)}<span>${VIGENTES.includes(c.estado) ? 'Faltan menos de 2 horas para la cita: ya no se puede reprogramar en línea. Comunícate con la clínica.' : 'Esta cita ya no está vigente.'}</span></div>`;
  } else {
    body += `<h2 class="mb12">Elige el nuevo horario</h2>${picker(st, 'rp', { servicioId: c.id_servicio, vetId: c.id_vet, petId: c.id_mascota, excluir: c.id, actual: ms(c.inicio) })}`;
    cta = `<div class="cta"><button type="button" class="btn pri block" data-a="rpOk" ${st.inicio ? '' : 'disabled'}>${st.inicio ? `Confirmar cambio · ${fShort(st.inicio)} a las ${fTime(st.inicio)}` : 'Elige un nuevo horario'}</button></div>`;
  }
  App.render(ownerShell(body + cta, null, mTop('Reprogramar cita', `#/d/cita/${c.id}`)));
};
ACT.rpOk = async () => {
  const st = Owner.rp, c = get('citas', st.citaId), nuevo = st.inicio;
  const ok = await confirmBox({
    title: '¿Cambiar el horario?',
    text: `La cita pasará del <b>${fShort(c.inicio)} a las ${fTime(c.inicio)}</b> al <b>${fLong(nuevo)} a las ${fTime(nuevo)}</b>. El horario anterior quedará libre.`,
    ok: 'Sí, reprogramar',
  });
  if (!ok) return;
  try {
    reprogramar(c.id, nuevo, Session.uid());
    Owner.rp = null;
    toast('Cita reprogramada. Te enviamos el nuevo horario.');
    go(`#/d/cita/${c.id}`);
  } catch (e) {
    toast(e.message, 'err');
    st.inicio = null;
    App.refresh();
  }
};

/* ---------- P06 Avisos: correos y SMS simulados (RF08, RF09) ---------- */
function msgInfo(msg) {
  if (msg.tipo === 'RECOMENDACION') {
    const r = msg.reco, pet = get('mascotas', r.petId);
    return { asunto: `${pet.nombre}: ${r.titulo.toLowerCase()}`, intro: esc(r.texto), pet, reco: r };
  }
  const s = msg.snap, pet = get('mascotas', s.id_mascota), when = D(s.inicio), hora = fTime(when), n = esc(pet.nombre);
  const T = {
    CONFIRMACION: [`Cita registrada: ${pet.nombre} el ${fShort(when)} a las ${hora}`, `Registramos la cita de <b>${n}</b>. Te enviaremos recordatorios 24 h y 2 h antes.`],
    H24: [`Recordatorio: cita de ${pet.nombre} ${relDay(when, D(msg.fecha))} a las ${hora}`, `Te recordamos la cita de <b>${n}</b>:`],
    H2: [`Tu cita de ${pet.nombre} es ${relDay(when, D(msg.fecha))} a las ${hora}`, `En unas horas es la cita de <b>${n}</b>:`],
    REPROGRAMACION: [`Cita reprogramada: ${pet.nombre}, ${fShort(when)} a las ${hora}`, `Cambiamos la cita de <b>${n}</b> al nuevo horario:`],
    CANCELACION: [`Cita cancelada: ${pet.nombre}, ${fShort(when)} a las ${hora}`, `Cancelamos la cita de <b>${n}</b>. El horario quedó libre.`],
    CANCELACION_CLINICA: [`La clínica canceló la cita de ${pet.nombre}`, `Por un imprevisto del veterinario cancelamos la cita de <b>${n}</b>. Disculpa las molestias; puedes reservar otro horario desde la app.`],
  }[msg.tipo];
  return { asunto: T[0], intro: T[1], pet, when, sv: get('servicios', s.id_servicio), vet: Q.vetName(s.id_vet, 'completo') };
}
Owner.avisos = () => {
  const { u } = ownerCtx(), lista = Q.mensajes(u.id);
  const body = `<p class="small muted mb12">Correos y SMS que VetCitas te envió.</p>
    <div class="note info mb16">${ic('info', 18)}<span><b>Modo demostración.</b> Los recordatorios llegan solos 24 h y 2 h antes de cada cita. Para probarlo ahora, <button type="button" class="btn link inline" data-a="demoRec">simula el siguiente recordatorio</button>.</span></div>
    ${lista.length ? `<div class="card p0">${lista.map(m => {
      const I = msgInfo(m);
      return `<a class="msg-item ${m.leido ? '' : 'unread'}" href="#/d/avisos/${m.id}"><span class="msg-ic${I.reco ? ' ai' : ''}">${ic(I.reco ? 'spark' : m.canal === 'SMS' ? 'msg' : 'mail', 18)}</span>
        <span class="grow min0"><span class="row between gap8"><span class="xs muted"><b>VetCitas</b> · ${m.canal === 'SMS' ? 'SMS' : 'Correo'}</span><span class="xs muted">${fWhen(m.fecha)}</span></span>
        <span class="subj block ellip">${esc(I.asunto)}</span></span>${m.leido ? '' : '<span class="dot"><span class="sr">Sin leer</span></span>'}</a>`;
    }).join('')}</div>` : '<div class="card empty"><div class="big">📭</div>Aún no tienes avisos.</div>'}`;
  App.render(ownerShell(body, 'avisos', mTop('Avisos')));
};
ACT.demoRec = () => {
  const n = enviarRecordatorioAhora(Session.uid());
  if (n) toast(n === 1 ? 'Te llegó un recordatorio nuevo.' : `Te llegaron ${n} recordatorios nuevos.`);
  else toast('No hay recordatorios pendientes. Reserva una cita con más de 2 horas de anticipación y vuelve a probar.', 'info');
  App.refresh();
};
Owner.aviso = id => {
  const { u } = ownerCtx(), msg = get('mensajes', id);
  if (!msg || msg.id_usuario !== u.id) return go('#/d/avisos', true);
  if (!msg.leido) { msg.leido = true; Store.save(); }
  if (msg.tipo === 'RECOMENDACION') return Owner.avisoReco(msg);
  const I = msgInfo(msg), c = get('citas', msg.id_cita), rec = msg.id_rec ? get('recordatorios', msg.id_rec) : null;
  const recordatorio = msg.tipo === 'H24' || msg.tipo === 'H2', actual = c.inicio === msg.snap.inicio;
  const vigente = VIGENTES.includes(c.estado) && ms(c.inicio) > Date.now();
  const modif = puedeModificar(c) ? `<div class="row gap8 mt8"><a class="btn sm sec grow" href="#/d/reprogramar/${c.id}">Reprogramar</a><button type="button" class="btn sm ghost grow" data-a="cancelCita" data-id="${c.id}">Cancelar</button></div>` : '';
  let acc = '';
  if (msg.tipo === 'CANCELACION_CLINICA') acc = `<button type="button" class="btn pri block" data-a="nuevaReserva">Reservar otro horario</button>`;
  else if (!recordatorio) acc = `<a class="btn sec block" href="#/d/cita/${c.id}">Ver mi cita</a>`;
  else if (!vigente) acc = `<div class="note info">${ic('info', 18)}<span>Esta cita ya no está vigente (${ESTADOS[c.estado].label}).</span></div>`;
  else if (!actual) acc = `<div class="note info">${ic('info', 18)}<span>Esta cita se reprogramó al ${fLong(c.inicio)} a las ${fTime(c.inicio)}.</span></div><a class="btn sec block mt8" href="#/d/cita/${c.id}">Ver mi cita</a>`;
  else if (c.estado === 'CONFIRMADA') acc = `<div class="note ok">${ic('check', 18)}<span>Asistencia confirmada. La cita figura como Confirmada en la agenda del veterinario.</span></div>${modif}`;
  else acc = `<button type="button" class="btn ok block" data-a="confirmTk" data-tk="${rec.token}">${ic('check', 18)} Confirmar asistencia</button>${modif}`;
  const datos = `<div class="box kv mt12 mb12"><div><span>Servicio</span><b>${esc(I.sv.nombre)}</b></div><div><span>Fecha</span><b>${fLong(I.when)}</b></div>
    <div><span>Hora</span><b>${fTime(I.when)}</b></div><div><span>Veterinario</span><b>${esc(I.vet)}</b></div></div>`;
  const pie = recordatorio ? `<p class="xs muted mt12">Recordatorio automático enviado ${msg.tipo === 'H24' ? '24 horas antes de la cita. Recibirás otro 2 horas antes.' : '2 horas antes de la cita.'}</p>` : '';
  const contenido = msg.canal === 'SMS'
    ? `<p class="xs muted center mb8">SMS · ${fDateTime(msg.fecha)}</p><div class="sms-bubble">VetCitas: ${esc(I.asunto)}. ${esc(I.sv.nombre)} con ${esc(I.vet)}. Gestiona tu cita aquí: vetcitas.pe/c/${(rec ? rec.token : String(msg.id).padStart(6, '0')).slice(0, 6)}</div>
       <p class="xs muted mt16 mb8">Al abrir el enlace del SMS:</p><div class="card">${datos}${acc}${pie}</div>`
    : `<h2>${esc(I.asunto)}</h2>
       <div class="row gap8 mt12 mb16"><span class="msg-ic">${ic('paw', 18)}</span><div class="min0"><p class="small ellip"><b>VetCitas</b> &lt;citas@vetcitas.pe&gt;</p><p class="xs muted">para mí · ${fShort(msg.fecha)}, ${fTime(msg.fecha)}</p></div></div>
       <div class="card"><p>Hola, ${esc(u.nombres.split(' ')[0])}. ${I.intro}</p>${msg.tipo === 'CANCELACION_CLINICA' || msg.tipo === 'CANCELACION' ? '<div class="mt12"></div>' : datos}${acc}${pie}</div>
       ${recordatorio && vigente && actual && c.estado !== 'CONFIRMADA' ? `<div class="note ok mt12">${ic('check', 18)}<span>Al tocar «Confirmar asistencia», la cita pasa a Confirmada en la agenda del veterinario.</span></div>` : ''}`;
  App.render(ownerShell(contenido, null, mTop('Bandeja de entrada', '#/d/avisos')));
};

/* ---------- Perfil ---------- */
Owner.perfil = () => {
  const { u, d } = ownerCtx();
  const body = `<div class="card row gap12"><span class="avatar me lg">${esc(iniciales(u))}</span><div class="min0"><h2 class="ellip">${esc(u.nombres)} ${esc(u.apellidos)}</h2><p class="small muted ellip">${esc(u.correo)}</p></div></div>
    <div class="sec-h"><h2 class="h3">Datos de contacto</h2><button type="button" class="btn link" data-a="perfilEdit">Editar</button></div>
    <div class="card kv"><div><span>Correo</span><span class="ellip">${esc(u.correo)}</span></div><div><span>Celular</span><span>${esc(u.telefono || '—')}</span></div></div>
    <div class="sec-h"><h2 class="h3">Recibir recordatorios por</h2></div>
    <div class="row gap8" role="radiogroup" aria-label="Canal de recordatorios">
      ${[['CORREO', 'mail', 'Correo'], ['SMS', 'msg', 'SMS']].map(([k, i, l]) => `<button type="button" class="opt ${d.canal === k ? 'on' : ''}" role="radio" aria-checked="${d.canal === k}" data-a="setCanal" data-c="${k}">${ic(i, 18)} ${l}</button>`).join('')}</div>
    <div class="sec-h"><h2 class="h3">Privacidad</h2></div>
    <div class="card row gap12 top small">${ic('lock', 18)}<span>Aceptaste el tratamiento de tus datos personales conforme a la Ley N.° 29733 el ${fDate(u.creado_en)}. Solo tú y la clínica pueden verlos.</span></div>
    <button type="button" class="btn ghost block mt24" data-a="logout">${ic('out', 18)} Cerrar sesión</button>`;
  App.render(ownerShell(body, 'perfil', mTop('Mi perfil')));
};
ACT.setCanal = el => {
  const { u, d } = ownerCtx(), c = el.dataset.c;
  if (d.canal === c) return;
  d.canal = c;
  db.recordatorios.forEach(r => { if (r.estado === 'PENDIENTE' && Q.owner(get('citas', r.id_cita).id_mascota).u.id === u.id) r.canal = c; });
  Store.save();
  toast(`Recibirás los recordatorios por ${canalTxt(c)}.`);
  App.refresh();
};
ACT.perfilEdit = () => {
  const { u } = ownerCtx();
  openModal(`${modalHead('Editar datos de contacto')}<form data-f="perfil" novalidate>
    <div class="row gap8 top"><div class="field grow"><label for="e-n">Nombres</label><input class="input" id="e-n" name="nombres" maxlength="60" value="${esc(u.nombres)}"></div>
    <div class="field grow"><label for="e-a">Apellidos</label><input class="input" id="e-a" name="apellidos" maxlength="60" value="${esc(u.apellidos)}"></div></div>
    <div class="field"><label for="e-t">Celular</label><input class="input" id="e-t" name="telefono" type="tel" inputmode="numeric" maxlength="11" value="${esc(u.telefono)}"></div>
    <div class="modal-actions"><button type="button" class="btn sec" data-a="modalClose">Cancelar</button><button class="btn pri">Guardar</button></div></form>`);
};
SUBMIT.perfil = f => {
  const { u } = ownerCtx(), tel = f.telefono.value.replace(/\D/g, ''), errs = {};
  if (f.nombres.value.trim().length < 2) errs.nombres = 'Escribe tus nombres.';
  if (f.apellidos.value.trim().length < 2) errs.apellidos = 'Escribe tus apellidos.';
  if (!/^9\d{8}$/.test(tel)) errs.telefono = 'Ingresa un celular de 9 dígitos que empiece con 9.';
  if (!setErrors(f, errs)) return;
  Object.assign(u, { nombres: f.nombres.value.trim(), apellidos: f.apellidos.value.trim(), telefono: fmtTel(tel) });
  Store.save();
  closeModal();
  toast('Datos actualizados.');
  App.refresh();
};

/* Mensaje proactivo de la IA: propone horarios para la recomendación y se agenda con un toque. */
Owner.avisoReco = msg => {
  const { u } = ownerCtx(), I = msgInfo(msg), r = recDe(msg.reco.key);
  const ofs = r ? IA.ofertasRecomendacion(r) : [];
  const vets = [...new Set(ofs.map(id => Q.vetName(IA.ofertas.get(id).vetId)))].join(' o ');
  App.render(ownerShell(`<h2>${esc(I.asunto)}</h2>
    <div class="row gap8 mt12 mb16"><span class="msg-ic ai">${ic('spark', 18)}</span><div class="min0"><p class="small ellip"><b>Vetty · Asistente IA</b> &lt;citas@vetcitas.pe&gt;</p><p class="xs muted">para mí · ${fShort(msg.fecha)}, ${fTime(msg.fecha)}</p></div></div>
    <div class="card"><div class="row gap12 top">${petAv(I.pet, 44)}<p>Hola, ${esc(u.nombres.split(' ')[0])}. Revisé el historial de <b>${esc(I.pet.nombre)}</b>: ${I.intro}</p></div>
      ${!r ? `<div class="note ok mt12">${ic('check', 18)}<span>¡Ya está agendado! Esta recomendación no tiene pendientes.</span></div>`
        : ofs.length ? `<p class="small mt12">Tengo estos horarios libres con ${esc(vets)}, ¿cuál te queda mejor?</p>${ofertasHtml(ofs)}<button type="button" class="btn link mt8" data-a="recManual" data-k="${r.key}">Prefiero elegir otro horario</button>`
          : `<p class="small mt12">No encontré horarios libres pronto; llama a la clínica al ${CLINICA.tel}.</p>`}
      <p class="xs muted mt12">Mensaje automático del asistente IA, generado a partir del historial clínico.</p></div>`, null, mTop('Bandeja de entrada', '#/d/avisos')));
};
