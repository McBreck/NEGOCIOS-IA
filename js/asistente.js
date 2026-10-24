'use strict';
/* Asistente IA del dueño («Vetty»): triage, derivación al especialista, agendamiento predictivo,
   recomendaciones del historial, cotización, fotos y dictado por voz. */
const Asis = { uid: null, msgs: [], ctx: null, typing: false, draft: '', rec: null, voz: '', autoMic: false };
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const bot = (html, x = {}) => ({ from: 'bot', html, ...x });
const CH = (l, v) => ({ l, v });
const INICIO = [CH('🩺 Tiene un síntoma', 'f:triage'), CH('💉 Vacuna o desparasitación', 'f:prevencion'), CH('💰 Cotizar un procedimiento', 'f:cotizar'),
  CH('✨ ¿Qué le toca a mi mascota?', 'f:recom'), CH('🚨 Es una emergencia', 'f:emerg')];
const DUR = { hoy: 'Hoy', d12: '1 a 2 días', d3: '3 días o más' };
const COME = { si: 'Sí, con normalidad', poco: 'Come poco', no: 'No come ni toma agua' };
const ALARMAS = { resp: 'dificultad para respirar', encias: 'encías pálidas o moradas', conv: 'convulsiones o desmayo', sangre: 'sangrado que no para' };
const ZONAS = [['Piel o pelaje', 'Dermatología'], ['Ojo', 'Oftalmología'], ['Oreja', 'Otología'], ['Pata o cojera', 'Traumatología'], ['Boca o dientes', 'Odontología'], ['Otra zona', 'Medicina general']];
const PROC = { esterilizacion: 'Esterilización o castración', dental: 'Limpieza dental' };

const asisPets = () => Q.petsOf(ownerCtx().d.id);
function iniciar(flow, extra = {}) { Asis.ctx = { flow, pet: null, textos: [], fotos: [], voz: '', ...extra }; }
function asisNuevo() {
  if (Asis.rec) Asis.rec.stop();
  Object.assign(Asis, { uid: Session.uid(), msgs: [], typing: false, draft: '', voz: '' });
  iniciar(null);
  const { u, d } = ownerCtx(), recs = IA.recomendacionesDueno(d.id);
  Asis.msgs.push(bot(`¡Hola, ${esc(u.nombres.split(' ')[0])}! Soy <b>Vetty</b>, el asistente con IA de VetCitas. Cuéntame qué necesita tu mascota y te propongo el horario y el veterinario más adecuados. Puedes escribir, dictar por voz 🎤 o enviarme una foto 📷.`));
  if (recs.length) Asis.msgs.push(bot(`Revisé el historial de tus mascotas: ${recs.map(r => `<b>${esc(get('mascotas', r.petId).nombre)}</b> tiene pendiente ${esc(r.titulo.toLowerCase())}`).join('; ')}.`));
  Asis.msgs[Asis.msgs.length - 1].chips = INICIO;
}
/* Muestra «escribiendo…» y luego las respuestas del asistente. */
function say(...msgs) {
  Asis.typing = true;
  App.refresh();
  setTimeout(() => {
    Asis.typing = false;
    Asis.msgs.push(...msgs.filter(Boolean));
    if (location.hash === '#/d/asistente') App.refresh();
  }, 700);
}
const user = html => Asis.msgs.push({ from: 'user', html });

/* ---------- Texto libre: se analiza y se decide el flujo ---------- */
function asisTexto(texto) {
  const a = IA.analizar(texto, asisPets()), c0 = Asis.ctx;
  const enCurso = c0.flow && !['fin', 'emergencia'].includes(c0.flow);
  if (a.emergencia) {
    if (!enCurso) iniciar('emergencia', { pet: a.pet && a.pet.id });
    else if (a.pet && !c0.pet) c0.pet = a.pet.id;
    Asis.ctx.textos.push(texto);
    return say(emergenciaMsg(a.emergencia));
  }
  if (!enCurso) {
    const pet = a.pet && a.pet.id;
    if (a.intent === 'emerg') { iniciar('emergencia', { pet, textos: [texto] }); return say(emergenciaMsg('emergencia reportada por el dueño')); }
    if (a.intent === 'saludo' && !a.area) return say(bot('¡Hola! ¿En qué te ayudo hoy?', { chips: INICIO }));
    if (['cotizar', 'esterilizacion', 'dental'].includes(a.intent)) iniciar('cotizar', { pet, proc: a.proc });
    else if (['vacuna', 'desparasitacion'].includes(a.intent)) iniciar('prevencion', { pet, tipo: a.intent });
    else if (a.intent === 'recom') iniciar('recom');
    else iniciar('triage', { pet });
  } else if (a.pet && !c0.pet) c0.pet = a.pet.id;
  const c = Asis.ctx;
  if (c.flow === 'triage') {
    c.textos.push(texto);
    if (Asis.voz) c.voz = [c.voz, Asis.voz].filter(Boolean).join(' ');
    if (a.area && (!c.area || c.area === 'Medicina general')) c.area = a.area;
    if (a.dur && !c.dur) c.dur = a.dur;
    if (a.come && !c.come) c.come = a.come;
  } else if (c.flow === 'cotizar' && !c.proc && a.proc) c.proc = a.proc;
  else if (c.flow === 'prevencion' && !c.tipo && ['vacuna', 'desparasitacion'].includes(a.intent)) c.tipo = a.intent;
  else if (a.area) iniciar('triage', { pet: c.pet, textos: [texto], area: a.area, dur: a.dur, come: a.come });
  return avanzar();
}

/* ---------- Respuestas rápidas ---------- */
function asisChip(v, label) {
  const k = v.slice(0, v.indexOf(':')), x = v.slice(v.indexOf(':') + 1), c = Asis.ctx;
  if (k === 'reset') { asisNuevo(); return App.refresh(); }
  if (k === 'mas') return masHorarios();
  if (k === 'go') {
    if (x === 'pet') return ACT.petNew();
    return go(x === 'inicio' ? '#/d/inicio' : `#/d/cita/${x.split('-')[1]}`);
  }
  user(esc(label));
  switch (k) {
    case 'f':
      if (x === 'emerg') { iniciar('emergencia'); return say(emergenciaMsg('emergencia reportada por el dueño')); }
      iniciar(x);
      return avanzar();
    case 'pet': c.pet = +x; return avanzar();
    case 'dur': c.dur = DUR[x]; return avanzar();
    case 'come': c.come = COME[x]; return avanzar();
    case 'alarma':
      if (x === 'no') { c.alarma = 'Ninguno'; return avanzar(); }
      return say(emergenciaMsg(ALARMAS[x]));
    case 'zona': c.zona = label; if (!c.area || c.area === 'Medicina general') c.area = x; return avanzar();
    case 'tipo': c.tipo = x; return avanzar();
    case 'proc': c.proc = x; return avanzar();
    case 'sexo': c.sexo = x; return avanzar();
    case 'peso': c.peso = +x; return avanzar();
    case 'alertpet': {
      const al = get('alertas', c.alerta);
      if (al) { al.id_mascota = +x; Store.save(); }
      c.pet = +x;
      return say(bot(`Listo, la clínica ya sabe que se trata de <b>${esc(get('mascotas', +x).nombre)}</b>. Si necesitas indicaciones mientras llegas, llama al ${CLINICA.tel}.`, { chips: [CH('Empezar de nuevo', 'reset:')] }));
    }
    default: return avanzar();
  }
}

/* ---------- Máquina de estados: pide el siguiente dato que falta o da el resultado ---------- */
function avanzar() {
  const c = Asis.ctx, pets = asisPets();
  if (!pets.length) return say(bot('Primero registra a tu mascota; así puedo revisar su edad, peso e historial.', { chips: [CH('Agregar mascota', 'go:pet')] }));
  if (c.flow === 'recom') return say(...recomMsgs());
  if (!c.pet) {
    if (pets.length === 1) c.pet = pets[0].id;
    else return say(bot({ cotizar: '¿Para cuál mascota quieres la cotización?', prevencion: '¿Para cuál de tus mascotas?' }[c.flow] || '¿Para cuál de tus mascotas es?', { chips: pets.map(m => CH(m.nombre, 'pet:' + m.id)) }));
  }
  const m = get('mascotas', c.pet), n = `<b>${esc(m.nombre)}</b>`;
  if (c.flow === 'triage') {
    if (!c.textos.length && !c.fotos.length) return say(bot(`Cuéntame qué le pasa a ${n}: qué notas, desde cuándo y si está comiendo. Puedes escribirlo, dictarlo 🎤 o enviarme una foto 📷.`));
    if (c.fotos.length && !c.zona && (!c.area || c.area === 'Medicina general')) return say(bot('Recibí la foto. ¿Qué zona del cuerpo se ve?', { chips: ZONAS.map(([l, a]) => CH(l, 'zona:' + a)) }));
    if (!c.dur) return say(bot(`Entiendo. ¿Desde cuándo ${n} está así?`, { chips: [CH('Desde hoy', 'dur:hoy'), CH('1 a 2 días', 'dur:d12'), CH('3 días o más', 'dur:d3')] }));
    if (!c.alarma) return say(bot('¿Notas alguno de estos signos de alarma?', { chips: [CH('Le cuesta respirar', 'alarma:resp'), CH('Encías pálidas o moradas', 'alarma:encias'), CH('Convulsiones o desmayo', 'alarma:conv'), CH('Sangrado que no para', 'alarma:sangre'), CH('Ninguno de estos', 'alarma:no')] }));
    if (!c.come) return say(bot(`¿${n} come y toma agua con normalidad?`, { chips: [CH('Sí, normal', 'come:si'), CH('Come poco', 'come:poco'), CH('No come ni toma agua', 'come:no')] }));
    return say(...resultadoTriage(m));
  }
  if (c.flow === 'prevencion') {
    if (!c.tipo) {
      const recs = IA.recomendaciones(m).filter(r => r.tipo !== 'seguimiento');
      const ch = [CH('💉 Vacuna', 'tipo:vacuna'), CH('🪱 Desparasitación', 'tipo:desparasitacion')];
      if (IA.edadMeses(m) >= 84) ch.push(CH('🩺 Chequeo geriátrico', 'tipo:geriatrico'));
      return say(bot(`Revisé el historial de ${n}. ${recs.length ? recs.map(r => `<b>${esc(r.titulo)}:</b> ${esc(r.texto)}`).join(' ') : 'Tiene sus vacunas y desparasitaciones al día.'} ¿Qué quieres agendar?`, { chips: ch }));
    }
    const plan = IA.plan(c, m), titulo = { vacuna: 'Vacunación', desparasitacion: 'Desparasitación', geriatrico: 'Chequeo geriátrico' }[c.tipo];
    return say(bot(plan.razon), ...propuesta(m, plan, {
      motivo: titulo, ia: { origen: 'prevencion', urgencia: 'normal', area: plan.vetArea, servicio: plan.sv.nombre, sintomas: [], respuestas: {}, fotos: [], voz: '', resumen: `${titulo} de ${m.nombre}, agendada con el asistente IA. ${plan.razon}` },
    }));
  }
  if (c.flow === 'cotizar') {
    if (!c.proc) return say(bot('¿Qué procedimiento quieres cotizar?', { chips: [CH(PROC.esterilizacion, 'proc:esterilizacion'), CH(PROC.dental, 'proc:dental')] }));
    if (c.proc === 'esterilizacion' && !m.sexo && !c.sexo) return say(bot(`¿${n} es macho o hembra? El procedimiento cambia según el sexo.`, { chips: [CH('Macho', 'sexo:M'), CH('Hembra', 'sexo:H')] }));
    if (!m.peso && !c.peso) return say(bot(`¿Cuánto pesa ${n} aproximadamente?`, { chips: [CH('Menos de 10 kg', 'peso:7'), CH('10 a 20 kg', 'peso:15'), CH('20 a 35 kg', 'peso:28'), CH('Más de 35 kg', 'peso:40')] }));
    return say(...resultadoCotizacion(m));
  }
  return say(bot('¿En qué más te ayudo?', { chips: INICIO }));
}

/* Propone horarios con un toque y guarda el plan para «Ver más horarios». */
function propuesta(m, plan, { urgencia = 'normal', motivo, ia, intro }) {
  const vetIds = IA.vetsPara(plan.vetArea);
  const ofs = IA.ofertasPara({ pet: m, sv: plan.sv, vetIds, urgencia, tranquilo: plan.tranquilo, motivo, ia });
  Asis.ctx.plan = { petId: m.id, servicioId: plan.sv.id, vetId: vetIds.length === 1 ? vetIds[0] : 0, motivo, ia, day: ofs.length ? ms(startOfDay(IA.ofertas.get(ofs[0]).inicio)) : null };
  Asis.ctx.flow = 'fin';
  if (!ofs.length) return [bot(`No encontré horarios libres en las próximas dos semanas. Llama a la clínica al ${CLINICA.tel} y te ayudamos a encontrar un espacio.`, { chips: [CH('Empezar de nuevo', 'reset:')] })];
  return [bot(intro || (urgencia === 'alta' ? 'Te propongo los horarios <b>más próximos</b>. Toca uno para reservarlo:' : `Estos son los mejores horarios para ${esc(m.nombre)}. Toca uno para reservarlo:`),
    { offers: ofs, chips: [CH('Ver más horarios', 'mas:'), CH('Empezar de nuevo', 'reset:')] })];
}
const nombresVets = ids => [...new Set(ids.map(v => Q.vetName(v)))].join(' o ');

function resultadoTriage(m) {
  const c = Asis.ctx, area = c.area || 'Medicina general', pr = IA.prioridad({ ...c, area }, m), plan = IA.plan({ ...c, area }, m);
  const datos = [especieLbl(m).toLowerCase(), m.nacimiento && edad(m.nacimiento), m.peso && m.peso + ' kg'].filter(Boolean).join(', ');
  const relato = c.textos.map(t => t.trim().replace(/[.\s]+$/, '')).join('. ');
  const resumen = `${m.nombre} (${datos}).${relato ? ' ' + relato + '.' : ''}${c.zona ? ` Envió una foto de: ${c.zona.toLowerCase()}.` : ''} Desde: ${c.dur.toLowerCase()}. ${c.come}. Sin signos de alarma. Área probable: ${area.toLowerCase()}.`;
  const ia = {
    origen: 'asistente', urgencia: pr.nivel, area, servicio: plan.sv.nombre, sintomas: [...c.textos], fotos: [...c.fotos], voz: c.voz,
    respuestas: { Desde: c.dur, 'Signos de alarma': 'Ninguno', 'Come y toma agua': c.come, ...(c.zona ? { 'Zona de la foto': c.zona } : {}) },
    razon: [pr.razones.length ? `Prioridad alta: ${pr.razones.join(', ')}.` : '', plan.razon].filter(Boolean).join(' '), resumen,
  };
  const evalHtml = `<div class="ia-eval">
    <div class="row between gap8 wrap"><b class="row gap8">${ic('spark', 16)} Mi evaluación</b>${pr.nivel === 'alta' ? '<span class="chip noas">Prioridad alta</span>' : '<span class="chip conf">Prioridad normal</span>'}</div>
    <div class="kv sm mt8"><div><span>Área probable</span><b>${esc(area)}</b></div><div><span>Servicio</span><b>${esc(plan.sv.nombre)} · ${plan.sv.duracion} min</b></div><div><span>Te atiende</span><b>${esc(nombresVets(IA.vetsPara(plan.vetArea)))}</b></div></div>
    ${pr.razones.length ? `<p class="small mt8">Le doy prioridad porque ${esc(pr.razones.join(' y '))}.</p>` : ''}
    <p class="small mt8">${esc(plan.razon)}</p>
    <p class="xs muted mt8">Es una orientación automática; el diagnóstico lo hace el veterinario. Si empeora, llama al ${CLINICA.tel}.</p></div>`;
  return [bot(evalHtml, { wide: true }), ...propuesta(m, plan, { urgencia: pr.nivel, motivo: (relato || `Consulta de ${area.toLowerCase()}`).slice(0, 200), ia })];
}

function resultadoCotizacion(m) {
  const c = Asis.ctx, q = IA.cotizar(c.proc, m, c.sexo, c.peso), label = PROC[c.proc];
  const datos = [especieLbl(m).toLowerCase(), `${q.kg} kg${!m.peso ? ' aprox.' : ''}`, m.nacimiento && edad(m.nacimiento)].filter(Boolean).join(', ');
  const html = `<div class="ia-eval">
    <div class="row between gap8 wrap"><b class="row gap8">${ic('tag', 16)} Cotización estimada</b><span class="chip repr">${esc(label)}</span></div>
    <p class="xs muted mt4">Calculada con los datos de ${esc(m.nombre)}: ${esc(datos)}.</p>
    <table class="quote mt8">${q.items.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${money(v)}</td></tr>`).join('')}<tr class="tot"><td>Rango estimado</td><td>${money(q.min)} – ${money(q.max)}</td></tr></table>
    <p class="xs muted mt8">${esc(q.nota)} Precios referenciales en soles.</p></div>`;
  const plan = { sv: IA.servicio('Valoración prequirúrgica'), vetArea: 'Cirugía', tranquilo: m.especie === 'Gato' };
  return [bot(html, { wide: true }), ...propuesta(m, plan, {
    motivo: `Valoración prequirúrgica: ${label.toLowerCase()}`,
    intro: '¿Separamos tu espacio para la <b>valoración prequirúrgica</b>? Es una consulta de 30 min donde el veterinario confirma el presupuesto. Toca un horario:',
    ia: {
      origen: 'cotizacion', urgencia: 'normal', area: 'Cirugía', servicio: plan.sv.nombre, sintomas: [], fotos: [], voz: '', respuestas: { Procedimiento: label },
      cotizacion: { proc: label, min: q.min, max: q.max }, resumen: `Valoración prequirúrgica para ${label.toLowerCase()} de ${m.nombre} (${datos}). Cotización estimada: ${money(q.min)} – ${money(q.max)}.`,
    },
  })];
}

function recomMsgs() {
  const recs = IA.recomendacionesDueno(ownerCtx().d.id);
  Asis.ctx.flow = 'fin';
  if (!recs.length) return [bot('Revisé el historial de tus mascotas y ¡todo está al día! 🎉 Te avisaré cuando les toque una vacuna, desparasitación o control.', { chips: INICIO })];
  return recs.map((r, i) => {
    const m = get('mascotas', r.petId), ofs = IA.ofertasRecomendacion(r);
    return bot(`<b>${esc(m.nombre)} · ${esc(r.titulo)}</b><br>${esc(r.texto)} ${ofs.length ? `Tengo estos horarios con ${esc(nombresVets(ofs.map(id => IA.ofertas.get(id).vetId)))}, ¿cuál te queda mejor?` : 'No encontré horarios libres pronto; llama a la clínica.'}`,
      { offers: ofs, chips: i === recs.length - 1 ? [CH('Empezar de nuevo', 'reset:')] : null });
  });
}

/* Código rojo: frena el agendamiento, muestra el contacto de emergencia y alerta a la clínica. */
function emergenciaMsg(motivo) {
  const c = Asis.ctx, { u } = ownerCtx(), m = c.pet ? get('mascotas', c.pet) : null, pets = asisPets();
  const al = insert('alertas', { id_mascota: m ? m.id : null, id_usuario: u.id, fecha: nowISO(), motivo, detalle: (c.textos || []).join(' · '), estado: 'ABIERTA' });
  Store.save();
  c.alerta = al.id;
  c.flow = 'emergencia';
  return bot(`<div class="emerg">
    <p><b>🚨 Esto puede ser una emergencia</b></p>
    <p class="small mt8">Detecté <b>${esc(motivo)}</b>. No esperes una cita: ${m ? `<b>${esc(m.nombre)}</b>` : 'tu mascota'} necesita atención inmediata.</p>
    <a class="btn danger block mt12" href="${CLINICA.telHref}">${ic('phone', 18)} Llamar a emergencias ${CLINICA.tel}</a>
    <p class="small mt12"><b>Dirección:</b> ${CLINICA.dir}</p>
    <p class="small mt8 ok-t"><b>✓ Avisamos a la clínica a las ${fTime(new Date())}</b> para que te esperen.</p>
    <p class="xs muted mt8">Mientras llegas: mantén a tu mascota abrigada y tranquila; no le des comida, agua ni medicamentos.</p></div>`,
  { wide: true, chips: m || !pets.length ? [CH('Empezar de nuevo', 'reset:')] : pets.map(p => CH(`Es ${p.nombre}`, 'alertpet:' + p.id)) });
}

function masHorarios() {
  const p = Asis.ctx.plan;
  if (!p) return;
  Owner.draft = nuevoDraft({ step: 3, petId: p.petId, servicioId: p.servicioId, vetId: p.vetId, motivo: p.motivo, ia: p.ia, day: p.day });
  go('#/d/reservar');
}

/* ---------- Ofertas de horario: reservar con un toque ---------- */
const diaCorto = t => (sameDay(t, new Date()) ? 'Hoy' : sameDay(t, addDays(new Date(), 1)) ? 'Mañana' : fShort(t));
function ofertasHtml(ids) {
  const os = ids.map(id => [id, IA.ofertas.get(id)]).filter(x => x[1]);
  const hecha = os.find(([, o]) => o.citaId);
  if (hecha) {
    const c = get('citas', hecha[1].citaId);
    return `<div class="offer-done">${ic('check', 16)} Reservado: ${fShort(c.inicio)} a las ${fTime(c.inicio)} · <a href="#/d/cita/${c.id}">ver cita</a></div>`;
  }
  return `<div class="offers">${os.map(([id, o]) => `<button type="button" class="offer" data-a="iaBook" data-o="${id}" aria-label="Reservar ${fLong(o.inicio)} a las ${fTime(o.inicio)} con ${esc(Q.vetName(o.vetId))}">
    <span class="o-d">${diaCorto(o.inicio)}</span><b>${fTime(o.inicio)}</b><span class="o-v">${esc(Q.vetName(o.vetId))}</span>${o.calma ? '<span class="o-t">🌿 Horario tranquilo</span>' : ''}</button>`).join('')}</div>`;
}
ACT.iaBook = async el => {
  const o = IA.ofertas.get(+el.dataset.o);
  if (!o) { toast('Esta propuesta ya no está disponible. Pide horarios nuevos.', 'err'); return; }
  const m = get('mascotas', o.petId), sv = get('servicios', o.servicioId), enChat = location.hash === '#/d/asistente';
  const ok = await confirmBox({
    title: '¿Reservar este horario?',
    text: `<b>${esc(m.nombre)}</b> · ${esc(sv.nombre)} (${sv.duracion} min)<br>${fLong(o.inicio)} a las ${fTime(o.inicio)}<br>${esc(Q.vetName(o.vetId, 'completo'))}`,
    ok: 'Sí, reservar',
  });
  if (!ok) return;
  try {
    const c = reservar({ petId: o.petId, servicioId: o.servicioId, vetId: o.vetId, inicio: o.inicio, motivo: o.motivo, uid: Session.uid(), ia: o.ia });
    o.citaId = c.id;
    if (enChat) {
      Asis.msgs.push(bot(`¡Listo! Reservé la cita de <b>${esc(m.nombre)}</b> para el ${fLong(c.inicio)} a las ${fTime(c.inicio)} con ${esc(Q.vetName(c.id_vet, 'completo'))}.${o.ia && o.ia.origen === 'asistente' ? ' Le envié al veterinario un resumen de lo que me contaste para que te atienda preparado.' : ''} Te recordaré la cita 24 h y 2 h antes.`,
        { chips: [CH('Ver mi cita', 'go:cita-' + c.id), CH('Nueva consulta', 'reset:')] }));
      App.refresh();
    } else {
      toast('¡Cita reservada!');
      go(`#/d/cita/${c.id}`);
    }
  } catch (e) {
    toast(e.message, 'err');
    IA.ofertas.delete(+el.dataset.o);
    App.refresh();
  }
};

/* ---------- Entradas: texto, respuestas rápidas, foto y voz ---------- */
SUBMIT.iaSend = f => {
  const t = f.msg.value.trim();
  if (Asis.typing || !t) return;
  if (Asis.rec) Asis.rec.stop();
  Asis.draft = '';
  user((Asis.voz ? `<span class="voz">${ic('mic', 13)} Dictado por voz</span>` : '') + esc(t));
  asisTexto(t);
  Asis.voz = '';
};
INPUT.iaDraft = el => { Asis.draft = el.value; };
ACT.iaChip = el => { if (!Asis.typing) asisChip(el.dataset.v, el.textContent.trim()); };
ACT.iaReset = () => { asisNuevo(); App.refresh(); };
ACT.iaFotoBtn = () => document.getElementById('ia-file').click();
ACT.iaHomeFoto = () => document.getElementById('home-file').click();
ACT.iaHome = el => {
  const f = el.dataset.f;
  if (!Asis.ctx || Asis.uid !== Session.uid() || f !== 'voz') asisNuevo();
  if (f === 'voz') { Asis.autoMic = true; return go('#/d/asistente'); }
  go('#/d/asistente');
  asisChip('f:' + f, INICIO.find(c => c.v === 'f:' + f).l);
};

function reducirImagen(file, max = 640) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k);
        cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = rej;
      img.src = fr.result;
    };
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}
INPUT.iaFoto = async (el, e) => {
  if (e.type !== 'change' || !el.files[0]) return;
  const f = el.files[0];
  el.value = '';
  if (!f.type.startsWith('image/')) { toast('Elige una imagen (JPG o PNG).', 'err'); return; }
  let src;
  try { src = await reducirImagen(f); } catch (err) { toast('No pude leer la imagen. Prueba con otra.', 'err'); return; }
  if (!Asis.ctx || Asis.uid !== Session.uid()) asisNuevo();
  if (Asis.ctx.flow !== 'triage') iniciar('triage', { pet: Asis.ctx.pet });
  Asis.ctx.fotos.push(src);
  user(`<img class="chat-img" src="${src}" alt="Foto enviada">`);
  if (location.hash !== '#/d/asistente') go('#/d/asistente');
  avanzar();
};

function micUI(on) {
  const b = document.getElementById('ia-mic'), i = document.getElementById('ia-in');
  if (b) { b.classList.toggle('rec', on); b.setAttribute('aria-label', on ? 'Detener dictado' : 'Dictar por voz'); }
  if (i) i.placeholder = on ? 'Te escucho… habla ahora' : 'Escribe qué le pasa a tu mascota…';
}
ACT.iaMic = () => {
  if (!SpeechRec) { toast('Tu navegador no permite dictar por voz. Prueba con Google Chrome o escribe el mensaje.', 'info'); return; }
  if (Asis.rec) { Asis.rec.stop(); return; }
  const inp = document.getElementById('ia-in'), base = inp.value.trim() ? inp.value.trim() + ' ' : '';
  const r = new SpeechRec();
  r.lang = 'es-PE';
  r.interimResults = true;
  r.onresult = e => {
    const t = [...e.results].map(x => x[0].transcript).join('');
    inp.value = base + t;
    Asis.draft = inp.value;
    Asis.voz = t;
  };
  r.onerror = e => toast(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Permite el uso del micrófono para dictar.' : e.error === 'no-speech' ? 'No escuché nada. Toca el micrófono e inténtalo otra vez.' : 'No pude usar el dictado por voz.', 'err');
  r.onend = () => { Asis.rec = null; micUI(false); };
  try { r.start(); Asis.rec = r; micUI(true); } catch (err) { toast('No pude iniciar el dictado.', 'err'); }
};

/* ---------- Pantalla del chat ---------- */
Owner.asistente = () => {
  if (!Asis.ctx || Asis.uid !== Session.uid()) asisNuevo();
  const last = Asis.msgs.length - 1, av = `<span class="vetty sm" aria-hidden="true">${ic('spark', 14)}</span>`;
  const chat = Asis.msgs.map((m, i) => (m.from === 'user'
    ? `<div class="bubble me">${m.html}</div>`
    : `<div class="bot-row">${av}<div class="bot-col"><div class="bubble${m.wide ? ' wide' : ''}">${m.html}</div>${m.offers ? ofertasHtml(m.offers) : ''}${m.chips && i === last && !Asis.typing
      ? `<div class="qchips">${m.chips.map(ch => `<button type="button" class="qchip" data-a="iaChip" data-v="${esc(ch.v)}">${esc(ch.l)}</button>`).join('')}</div>` : ''}</div></div>`)).join('');
  const typing = Asis.typing ? `<div class="bot-row">${av}<div class="bubble typing" role="status" aria-label="Vetty está escribiendo"><i></i><i></i><i></i></div></div>` : '';
  const top = `<header class="m-top chat-top"><a class="back" href="#/d/inicio" aria-label="Volver al inicio">${ic('back', 20)}</a><span class="vetty" aria-hidden="true">${ic('spark', 20)}</span>
    <div class="grow min0"><h1 tabindex="-1">Vetty</h1><p class="xs muted">Asistente con IA · te responde al instante</p></div>
    <button type="button" class="iconbtn" data-a="iaReset" aria-label="Nueva conversación" title="Nueva conversación">${ic('refresh', 18)}</button></header>`;
  const composer = `<form class="composer" data-f="iaSend" novalidate>
    <button type="button" class="cbtn" data-a="iaFotoBtn" aria-label="Enviar una foto">${ic('camera', 22)}</button>
    <input type="file" id="ia-file" accept="image/*" hidden data-i="iaFoto">
    <label class="sr" for="ia-in">Escribe tu mensaje</label>
    <input class="input" id="ia-in" name="msg" autocomplete="off" maxlength="400" placeholder="Escribe qué le pasa a tu mascota…" value="${esc(Asis.draft)}" data-i="iaDraft">
    <button type="button" class="cbtn ${Asis.rec ? 'rec' : ''}" id="ia-mic" data-a="iaMic" aria-label="${Asis.rec ? 'Detener dictado' : 'Dictar por voz'}">${ic('mic', 22)}</button>
    <button class="cbtn send" aria-label="Enviar">${ic('send', 20)}</button>
  </form>`;
  App.after.push(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    if (Asis.autoMic) { Asis.autoMic = false; ACT.iaMic(); }
  });
  App.render(ownerShell(`<div class="chat" role="log" aria-label="Conversación con Vetty">${chat}${typing}</div>${composer}`, 'asistente', top));
};
