'use strict';
/* Motor del asistente IA «Vetty»: triage, derivación al especialista, agendamiento predictivo,
   recomendaciones preventivas y cotización. En la maqueta corre en el navegador con reglas y
   palabras clave; en producción se reemplaza por un modelo de lenguaje detrás de la API. */
const CLINICA = { tel: '(044) 600 600', telHref: 'tel:044600600', dir: 'Av. América Sur 1250, Trujillo' };
const AREAS_VET = ['Medicina general', 'Vacunación', 'Dermatología', 'Gastroenterología', 'Traumatología', 'Oftalmología', 'Otología', 'Comportamiento', 'Felinos', 'Cirugía'];

/* Los patrones trabajan sobre texto normalizado (sin tildes ni mayúsculas). */
const EMERGENCIAS = [
  [/no (puede )?respira|dificultad para respirar|le cuesta respirar|respira (con dificultad|muy rapido|mal)|se ahoga|ahogando/, 'dificultad para respirar'],
  [/convuls|ataque epilep|temblores fuertes/, 'convulsiones'],
  [/encias? (muy )?(blancas|palidas|moradas|azul)/, 'encías pálidas o moradas'],
  [/atropell|lo choco|la choco|cayo de (un |una )?(piso|altura|segundo|tercer|ventana)/, 'traumatismo grave'],
  [/sangra (mucho|sin parar|abundante)|no (para|deja) de sangrar|hemorragia/, 'sangrado abundante'],
  [/envenen|veneno|raticida|intoxic|comio (chocolate|uvas|pasas|cebolla|pastillas)/, 'posible intoxicación'],
  [/inconsciente|se desmay|no reacciona|colaps/, 'pérdida de conciencia'],
  [/golpe de calor/, 'golpe de calor'],
  [/no (puede )?orinar|no hace pis|intenta orinar y no/, 'no puede orinar'],
  [/(barriga|abdomen|panza) (muy )?(hinchad|distendid|dur)/, 'abdomen hinchado'],
];
const AREAS = [
  ['Dermatología', /piel|pica\b|picazon|rasca|pelo|calv|herida|alergi|hongo|sarna|pulga|garrapat|grano|roncha|costra|lunar|bulto|dermat/],
  ['Gastroenterología', /vomit|diarrea|no come|no quiere comer|apetito|estomago|heces|caca|estren|nausea|babea/],
  ['Traumatología', /coje|cojea|renque|pata|fractur|hueso|cadera|golpe|cayo|caida|no apoya|columna|rodilla/],
  ['Respiratorio', /\btos|tose|estornud|moco|resfri|nariz/],
  ['Oftalmología', /\bojo|lagan|lagrim|parpado/],
  ['Otología', /oido|oreja|sacude la cabeza/],
  ['Odontología', /diente|muela|aliento|sarro|encia|boca/],
  ['Comportamiento', /estres|agresiv|ansied|miedo|comportamiento|muerde|se esconde|orina fuera|nervios/],
  ['Urinario', /orina|pis\b|cistitis|toma mucha agua/],
];
const INTENCIONES = [
  ['cotizar', /cuanto (cuesta|sale|cobran|vale)|precio|cotiz|presupuesto|costo/],
  ['esterilizacion', /esteriliz|castr/],
  ['dental', /limpieza dental|profilaxis|limpieza de dientes/],
  ['vacuna', /vacun|refuerzo|rabia|sextuple|triple felina/],
  ['desparasitacion', /desparasit|parasit|lombri/],
  ['recom', /que le toca|recomienda|recomendacion|pendiente|al dia/],
  ['emerg', /emergencia|urgencia|urgente/],
  ['saludo', /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey)\b/],
];
/* Área detectada → área de atención que debe tener el veterinario. */
const AREA_A_VET = {
  Dermatología: 'Dermatología', Traumatología: 'Traumatología', Gastroenterología: 'Gastroenterología', Oftalmología: 'Oftalmología',
  Otología: 'Otología', Comportamiento: 'Comportamiento', Odontología: 'Cirugía', Respiratorio: 'Medicina general',
  Urinario: 'Medicina general', 'Medicina general': 'Medicina general',
};
const ESPECIALIDAD = ['Dermatología', 'Traumatología', 'Oftalmología', 'Otología', 'Comportamiento', 'Odontología'];

const IA = {
  ofertas: new Map(),
  seq: 0,

  edadMeses(m) {
    if (!m.nacimiento) return 36;
    const n = parseDate(m.nacimiento), h = new Date();
    return (h.getFullYear() - n.getFullYear()) * 12 + h.getMonth() - n.getMonth();
  },
  /* Servicio activo por nombre; si el administrador lo desactivó, cae en la consulta general. */
  servicio(nombre) {
    return db.servicios.find(s => s.nombre === nombre && s.activo)
      || db.servicios.find(s => s.nombre === 'Consulta general' && s.activo) || db.servicios.find(s => s.activo);
  },
  vetsPara(area) {
    const act = Q.vetsActivos(), esp = act.filter(v => (v.areas || []).includes(area));
    return (esp.length ? esp : act).map(v => v.id);
  },

  analizar(texto, pets) {
    const t = norm(texto), r = { emergencia: null, area: null, intent: null, proc: null, pet: null, dur: null, come: null };
    const e = EMERGENCIAS.find(([re]) => re.test(t));
    if (e) r.emergencia = e[1];
    const a = AREAS.find(([, re]) => re.test(t));
    if (a) r.area = a[0];
    const i = INTENCIONES.find(([, re]) => re.test(t));
    if (i) r.intent = i[0];
    r.proc = /esteriliz|castr/.test(t) ? 'esterilizacion' : /limpieza dental|profilaxis|limpieza de dientes|sarro/.test(t) ? 'dental' : null;
    r.pet = pets.find(m => new RegExp(`\\b${norm(m.nombre)}\\b`).test(t))
      || (/\b(mi )?(perr|cachorr)/.test(t) && pets.filter(m => m.especie === 'Perro').length === 1 && pets.find(m => m.especie === 'Perro'))
      || (/\b(mi )?(gat|michi|minino)/.test(t) && pets.filter(m => m.especie === 'Gato').length === 1 && pets.find(m => m.especie === 'Gato')) || null;
    if (/\bhoy\b|esta manana|esta tarde|hace (unas |un par de )?horas|recien/.test(t)) r.dur = 'Hoy';
    else if (/ayer|anoche|hace (1|2|un|dos) dias?/.test(t)) r.dur = '1 a 2 días';
    else if (/hace (3|4|5|6|7|tres|cuatro|cinco|seis|varios|mas de)|semana|semanas|\bmes\b|meses/.test(t)) r.dur = '3 días o más';
    if (/no (come|quiere comer|toma agua|bebe)/.test(t)) r.come = 'No come ni toma agua';
    else if (/come poco|comiendo poco|poco apetito/.test(t)) r.come = 'Come poco';
    return r;
  },

  /* Prioridad del triage (sin signos de alarma) y razones que se explican al dueño. */
  prioridad(ctx, m) {
    const t = norm(ctx.textos.join(' ')), meses = IA.edadMeses(m), razones = [];
    if (ctx.come === 'No come ni toma agua') razones.push('no come ni toma agua');
    if (ctx.dur === '3 días o más' && ['Gastroenterología', 'Respiratorio', 'Urinario'].includes(ctx.area)) razones.push('lleva varios días con síntomas');
    if (/vomit/.test(t) && /diarrea/.test(t)) razones.push('tiene vómitos y diarrea a la vez');
    if (ctx.area === 'Gastroenterología' && (meses < 6 || meses >= 120)) razones.push(meses < 6 ? 'es cachorro y se deshidrata rápido' : 'es adulto mayor y se deshidrata rápido');
    if (/no apoya/.test(t)) razones.push('no apoya la pata');
    return { nivel: razones.length ? 'alta' : 'normal', razones };
  },

  /* Agendamiento predictivo: qué servicio, cuánto dura, con qué área y si conviene un horario tranquilo. */
  plan(ctx, m) {
    const gato = m.especie === 'Gato', meses = IA.edadMeses(m), n = m.nombre, o = m.sexo === 'H' ? 'a' : 'o';
    if (ctx.flow === 'prevencion') {
      const P = {
        vacuna: ['Vacunación', 'Vacunación', meses < 12 ? `Como ${n} es cachorr${o}, reservé un bloque corto de 15 min dentro de su plan de vacunas.` : 'El refuerzo de vacunas toma unos 15 minutos.'],
        desparasitacion: ['Desparasitación', 'Medicina general', 'La desparasitación toma unos 15 minutos.'],
        geriatrico: ['Chequeo geriátrico', 'Medicina general', `Para ${n} reservé 45 min: el chequeo geriátrico incluye examen completo y análisis.`],
      }[ctx.tipo];
      return { sv: IA.servicio(P[0]), vetArea: P[1], tranquilo: gato, razon: P[2] + (gato ? ' Elegí horarios con poca afluencia de perros.' : '') };
    }
    const area = ctx.area || 'Medicina general';
    if (area === 'Comportamiento' && gato) {
      return { sv: IA.servicio('Consulta felina tranquila'), vetArea: 'Comportamiento', tranquilo: true, razon: `Los gatos se estresan con los ladridos de la sala de espera: reservé 40 min en horarios de baja afluencia de perros para que ${n} esté más tranquil${o}.` };
    }
    if (ESPECIALIDAD.includes(area)) {
      return { sv: IA.servicio('Consulta de especialidad'), vetArea: AREA_A_VET[area], tranquilo: gato, razon: `Te derivo con un especialista en ${area.toLowerCase()} y reservo 40 min para una evaluación completa.${gato ? ' Elegí horarios con poca afluencia de perros.' : ''}` };
    }
    return { sv: IA.servicio('Consulta general'), vetArea: AREA_A_VET[area] || 'Medicina general', tranquilo: gato, razon: `Una consulta de 30 min es suficiente para evaluar estos síntomas.${gato ? ` Elegí horarios con poca afluencia de perros para que ${n} esté más tranquil${o}.` : ''}` };
  },

  /* Cantidad de perros en la sala una hora antes y después del horario (menos es más tranquilo). */
  tranquilidad(t, dur) {
    const a = ms(t) - HOUR, b = ms(t) + dur * MIN + HOUR;
    return db.citas.filter(c => c.estado !== 'CANCELADA' && overlap(ms(c.inicio), ms(c.fin), a, b) && get('mascotas', c.id_mascota).especie === 'Perro').length;
  },

  /* Propone n horarios: los más próximos si es prioritario; los más tranquilos para gatos; si no, repartidos en días y turnos. */
  sugerir({ pet, sv, vetIds, urgencia = 'normal', tranquilo = false, n = 3 }) {
    const hoy = startOfDay(new Date()), libres = new Map();
    for (let i = 0; i < 14; i++) {
      const day = addDays(hoy, i);
      vetIds.forEach(v => horariosDelDia({ day, servicioId: sv.id, vetId: v, petId: pet.id }).forEach(x => {
        if (x.libre && !libres.has(ms(x.inicio))) libres.set(ms(x.inicio), { inicio: x.inicio, vetId: v });
      }));
    }
    let L = [...libres.values()].sort(by(x => ms(x.inicio)));
    if (urgencia === 'alta') return L.slice(0, n);
    if (tranquilo) {
      L = L.slice(0, 80);
      L.forEach(x => { x.calma = IA.tranquilidad(x.inicio, sv.duracion); });
      const min = Math.min(...L.map(x => x.calma));
      L = L.filter(x => x.calma === min);
    }
    const pick = [], add = x => { if (x && !pick.includes(x) && pick.length < n) pick.push(x); };
    add(L[0]);
    add(L.find(x => pick[0] && !sameDay(x.inicio, pick[0].inicio)));
    add(L.find(x => D(x.inicio).getHours() >= 14 && !pick.includes(x)));
    L.forEach(add);
    return pick.sort(by(x => ms(x.inicio)));
  },

  oferta(o) { const id = ++IA.seq; IA.ofertas.set(id, o); return id; },
  ofertasPara({ pet, sv, vetIds, urgencia, tranquilo, motivo, ia }) {
    return IA.sugerir({ pet, sv, vetIds, urgencia, tranquilo }).map(s => IA.oferta({
      petId: pet.id, servicioId: sv.id, vetId: s.vetId, inicio: ms(s.inicio), calma: tranquilo && s.calma === 0, motivo, ia,
    }));
  },

  /* Recomendaciones preventivas a partir del historial clínico de la mascota. */
  recomendaciones(m) {
    const cs = Q.citasOfPet(m.id), aten = cs.filter(c => c.estado === 'ATENDIDA'), now = Date.now();
    const nombre = c => get('servicios', c.id_servicio).nombre;
    const futuras = cs.filter(c => VIGENTES.includes(c.estado) && ms(c.inicio) > now);
    const tieneFutura = ns => futuras.some(c => ns.includes(nombre(c)));
    const ultima = n => aten.find(c => nombre(c) === n);
    const meses = IA.edadMeses(m), out = [];
    const v = ultima('Vacunación'), venceV = v && addDays(v.inicio, 365);
    if (!tieneFutura(['Vacunación']) && (meses < 12 || !v || ms(venceV) - now < 30 * DAY)) {
      out.push({
        key: `vac-${m.id}-${v ? v.id : 'n'}`, tipo: 'vacuna', servicio: 'Vacunación', area: 'Vacunación',
        titulo: meses < 12 ? 'Plan de vacunas de cachorro' : 'Refuerzo anual de vacunas',
        texto: v ? `Su última vacuna fue el ${fDate(v.inicio)}; el refuerzo anual ${ms(venceV) < now ? 'venció' : 'vence'} el ${fDate(venceV)}.` : `No tenemos registro de vacunas de ${m.nombre} en la clínica.`,
      });
    }
    const d = ultima('Desparasitación'), venceD = d && addDays(d.inicio, 90);
    if (!tieneFutura(['Desparasitación']) && (!d || ms(venceD) - now < 14 * DAY)) {
      out.push({
        key: `des-${m.id}-${d ? d.id : 'n'}`, tipo: 'desparasitacion', servicio: 'Desparasitación', area: 'Medicina general', titulo: 'Desparasitación trimestral',
        texto: d ? `La última fue el ${fDate(d.inicio)} y se recomienda cada 3 meses.` : `No registramos desparasitaciones de ${m.nombre}; se recomienda cada 3 meses.`,
      });
    }
    aten.slice(0, 3).forEach(c => {
      const x = norm(c.observaciones || '').match(/control en (\d+) (dias|meses)|retirar puntos en (\d+) dias/);
      if (!x) return;
      const due = addDays(c.inicio, x[1] ? +x[1] * (x[2] === 'meses' ? 30 : 1) : +x[3]);
      if (ms(due) < now - 30 * DAY || ms(due) > now + 21 * DAY) return;
      if (tieneFutura(['Consulta general', 'Control postoperatorio', 'Consulta de especialidad'])) return;
      out.push({
        key: `seg-${c.id}`, tipo: 'seguimiento', servicio: x[3] ? 'Control postoperatorio' : 'Consulta general', area: 'Medicina general', vetId: c.id_vet,
        titulo: 'Control de seguimiento', texto: `En su atención del ${fDate(c.inicio)} el veterinario indicó: «${c.observaciones}» Le toca alrededor del ${fDate(due)}.`,
      });
    });
    if (meses >= 84 && !tieneFutura(['Chequeo geriátrico']) && !aten.some(c => nombre(c) === 'Chequeo geriátrico' && ms(c.inicio) > now - 180 * DAY)) {
      out.push({
        key: `ger-${m.id}-${new Date().getFullYear()}`, tipo: 'geriatrico', servicio: 'Chequeo geriátrico', area: 'Medicina general', titulo: 'Chequeo geriátrico semestral',
        texto: `${m.nombre} tiene ${edad(m.nacimiento)}; desde los 7 años se recomienda un chequeo cada 6 meses.`,
      });
    }
    return out.map(r => ({ ...r, petId: m.id }));
  },
  recomendacionesDueno: dId => Q.petsOf(dId).flatMap(m => IA.recomendaciones(m)),
  ofertasRecomendacion(r) {
    const m = get('mascotas', r.petId), sv = IA.servicio(r.servicio);
    return IA.ofertasPara({
      pet: m, sv, vetIds: r.vetId && Q.vetUser(r.vetId).activo ? [r.vetId] : IA.vetsPara(r.area), tranquilo: m.especie === 'Gato', motivo: r.titulo,
      ia: { origen: 'recomendacion', urgencia: 'normal', area: r.area, servicio: sv.nombre, sintomas: [], respuestas: {}, fotos: [], voz: '', resumen: `Propuesta por el asistente IA a partir del historial: ${r.titulo.toLowerCase()}. ${r.texto}` },
    });
  },
  /* Envía al buzón del dueño cada recomendación nueva (una sola vez). */
  notificarRecomendaciones(uid) {
    const d = Q.duenoByUser(uid);
    if (!d) return;
    let n = 0;
    IA.recomendacionesDueno(d.id).forEach(r => {
      if (db.recAvisadas.includes(r.key)) return;
      db.recAvisadas.push(r.key);
      insert('mensajes', { id_usuario: uid, id_cita: null, id_rec: null, tipo: 'RECOMENDACION', canal: d.canal, fecha: nowISO(), leido: false, snap: null, reco: r });
      n++;
    });
    if (n) Store.save();
  },

  /* Cotización estimada con exámenes prequirúrgicos (montos referenciales). */
  cotizar(proc, m, sexo, peso) {
    const kg = peso || m.peso || (m.especie === 'Gato' ? 4 : 15), anios = IA.edadMeses(m) / 12, gato = m.especie === 'Gato', hembra = (sexo || m.sexo) === 'H';
    const items = [];
    if (proc === 'esterilizacion') {
      let base = gato ? (hembra ? 250 : 180) : kg < 10 ? 350 : kg < 20 ? 450 : kg < 35 ? 550 : 700;
      if (!gato && !hembra) base = Math.round(base * 0.75 / 10) * 10;
      items.push([hembra ? 'Ovariohisterectomía (esterilización)' : 'Orquiectomía (castración)', base]);
    } else {
      items.push(['Profilaxis dental con ultrasonido', kg < 10 ? 220 : kg < 25 ? 280 : 340]);
    }
    items.push(['Anestesia inhalatoria y monitoreo', Math.round(80 + 4 * kg)], ['Hemograma completo', 45], ['Perfil bioquímico (hígado y riñón)', 70]);
    if (anios >= 7) items.push(['Electrocardiograma (mayor de 7 años)', 60], ['Radiografía de tórax', 80]);
    items.push(['Medicación y control postoperatorio', 60]);
    if (proc === 'esterilizacion') items.push(['Collar isabelino', 25]);
    const total = items.reduce((s, x) => s + x[1], 0);
    return {
      proc, items, total, kg, min: Math.round(total * 0.95 / 5) * 5, max: Math.round(total * 1.15 / 5) * 5,
      nota: proc === 'dental' ? 'Si se necesitan extracciones, se suman de S/ 30 a S/ 150 por pieza.' : 'El monto final se confirma en la valoración prequirúrgica.',
    };
  },
};
