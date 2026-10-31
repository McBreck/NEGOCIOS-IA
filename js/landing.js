'use strict';
/* Landing pública de VetCitas. Cada componente es una función que devuelve su HTML; Landing.page() los compone. */
const Landing = { slide: 0, testi: 0, timer: null, paused: false, obs: null };

/* ---------- Contenido ---------- */
const L_NAV = [
  ['inicio', 'Inicio', 'accent'],
  ['servicios', 'Servicios', 'yellow'],
  ['nosotros', 'Nosotros', 'wine'],
  ['testimonios', 'Testimonios', 'teal'],
  ['contacto', 'Contacto', 'secondary'],
];
const L_SLIDES = [
  { img: 'assets/hero-1.svg', alt: 'Ilustración de un perro y un gato sentados juntos', t: 'La salud de tu mascota, a un toque', d: 'Reserva, reprograma y recibe recordatorios desde el celular.', cta: ['Reservar una cita', '#/login'] },
  { img: 'assets/hero-2.svg', alt: 'Ilustración de un celular con el chat del asistente Vetty y un perro', t: 'Vetty, tu asistente con IA', d: 'Cuéntale qué le pasa a tu mascota y te propone el servicio y el especialista adecuados.', cta: ['Probar el asistente', '#/login'] },
  { img: 'assets/hero-3.svg', alt: 'Ilustración de un calendario con un día confirmado, un reloj y un gato', t: 'Una agenda clara para tu veterinario', d: 'Horarios sin cruces y el resumen de cada caso antes de atender.', cta: ['Crear cuenta gratis', '#/registro'] },
];
const L_CARDS = [
  { icon: 'spark', color: 'accent', t: 'Triage con IA', d: 'Vetty pregunta por los síntomas, asigna la prioridad y detecta emergencias antes de agendar.',
    more: 'El asistente pregunta desde cuándo ocurre, si hay signos de alarma y cómo está el apetito. Con eso asigna prioridad alta o normal y te explica por qué. Si detecta una emergencia (dificultad para respirar, convulsiones, intoxicación…), frena la reserva, te muestra el teléfono de la clínica y avisa al equipo.' },
  { icon: 'cal', color: 'yellow', t: 'Agenda sin cruces', d: 'Solo ves horarios realmente libres y la duración se ajusta al servicio que necesita tu mascota.',
    more: 'Cada servicio tiene su duración (una vacuna no ocupa lo mismo que una consulta de especialidad), así que nunca se cruzan dos citas del mismo veterinario ni de la misma mascota. Puedes reprogramar o cancelar hasta 2 horas antes.' },
  { icon: 'bell', color: 'wine', t: 'Recordatorios', d: 'Avisos por correo o SMS 24 h y 2 h antes, y refuerzos de vacunas según el historial.',
    more: 'Recibes un recordatorio un día antes y otro dos horas antes, y confirmas tu asistencia con un toque. Además, la IA revisa el historial y te avisa cuando toca un refuerzo de vacuna, una desparasitación o un control.' },
  { icon: 'users', color: 'teal', t: 'Especialistas', d: 'Te derivamos al área adecuada: dermatología, traumatología, gastroenterología y más.',
    more: 'Según lo que cuentes, Vetty identifica el área probable y te propone al veterinario que la atiende. Para gatos elige horarios tranquilos, con pocos perros en la sala de espera.' },
];
const L_VENTAJAS = [
  ['24/7', 'Reserva en línea', 'accent'],
  ['2 h', 'Para reprogramar o cancelar', 'yellow'],
  ['0', 'Cruces de horario', 'wine'],
  ['15 min', 'De tolerancia en tu cita', 'teal'],
];
const L_TESTIMONIOS = [
  { q: 'Le conté a Vetty que Rocky vomitaba y me dio cita el mismo día con prioridad. El doctor ya sabía todo cuando llegamos.', n: 'Lucía P.', r: 'Dueña de Rocky y Mishi', c: 'accent-ink' },
  { q: 'Mi gata se estresa mucho en la clínica. Ahora me proponen horarios con la sala tranquila y llega mucho más calmada.', n: 'Marco C.', r: 'Dueño de Luna', c: 'secondary-ink' },
  { q: 'Los recordatorios me salvaron: no se me pasó ningún refuerzo de vacuna de Kira en todo el año.', n: 'Rosa L.', r: 'Dueña de Kira', c: 'wine' },
];
const L_MAP = { lat: -8.1236, lon: -79.0322 };

/* ---------- Componentes ---------- */
const lTitle = (txt, hl) => `${txt} <span class="hl">${hl}</span>`;

function LandingHeader() {
  const u = Session.user();
  const cta = u ? `<a class="btn pri sm" href="${HOME[u.rol]}">Ir a mi panel</a>` : `<a class="btn pri sm" href="#/login">Ingresar</a>`;
  return `<header class="l-header">
    <div class="l-container l-header-in">
      <a class="l-logo" href="#/" data-a="lGo" data-s="inicio" aria-label="VetCitas, ir al inicio"><span class="l-logo-ic">${ic('paw', 22)}</span><span>Vet<b>Citas</b></span></a>
      <button type="button" class="l-burger" data-a="lMenu" aria-expanded="false" aria-controls="l-menu" aria-label="Abrir menú">${ic('menu', 24)}</button>
      <nav class="l-nav" id="l-menu" aria-label="Secciones">
        <ul>${L_NAV.map(([id, label, c], i) => `<li><a class="l-tab${i === 0 ? ' on' : ''}" style="--tab:var(--c-${c})" href="#/" data-a="lGo" data-s="${id}"${i === 0 ? ' aria-current="true"' : ''}>${label}</a></li>`).join('')}</ul>
        ${cta}
      </nav>
    </div>
  </header>`;
}

function Hero() {
  const n = L_SLIDES.length;
  return `<section class="l-hero" id="l-inicio" aria-roledescription="carrusel" aria-label="Destacados">
    <div class="l-slides" aria-live="off">
      ${L_SLIDES.map((s, i) => `<div class="l-slide${i === 0 ? ' on' : ''}" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${n}"${i === 0 ? '' : ' aria-hidden="true" inert'}>
        <img src="${s.img}" alt="${s.alt}" width="1600" height="640"${i === 0 ? '' : ' loading="lazy"'}>
        <div class="l-container l-cap-wrap"><div class="l-cap">
          <p class="l-cap-t">${s.t}</p>
          <p class="l-cap-d">${s.d}</p>
          <a class="btn pri" href="${s.cta[1]}">${s.cta[0]}</a>
        </div></div>
      </div>`).join('')}
    </div>
    <div class="l-dots">
      ${L_SLIDES.map((_, i) => `<button type="button" class="l-dot${i === 0 ? ' on' : ''}" data-a="lSlide" data-n="${i}" aria-label="Mostrar diapositiva ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('')}
      <button type="button" class="l-play" data-a="lPause" aria-label="Pausar el carrusel">${ic('pause', 14)}</button>
    </div>
  </section>`;
}

function Slogan() {
  return `<section class="l-section l-slogan">
    <div class="l-container">
      <h1 tabindex="-1">Cuidamos a tu mascota con citas<br>más <span class="hl">inteligentes</span></h1>
      <p>VetCitas reúne la reserva de citas, los recordatorios y un asistente con inteligencia artificial que entiende lo que le pasa a tu mascota y lo comparte con tu veterinario antes de la consulta.</p>
    </div>
  </section>`;
}

function ServiceCards() {
  return `<section class="l-section l-alt" id="l-servicios" aria-labelledby="l-servicios-t">
    <div class="l-container">
      <h2 class="l-h2 center" id="l-servicios-t" tabindex="-1">${lTitle('Todo lo que tu mascota', 'necesita')}</h2>
      <div class="l-grid mt24">
        ${L_CARDS.map((c, i) => `<article class="l-card c-12 c-md-6 c-lg-3">
          <span class="l-circle" style="--circle:var(--c-${c.color})">${ic(c.icon, 28)}</span>
          <h3>${c.t}</h3>
          <p>${c.d}</p>
          <button type="button" class="l-more" data-a="lMore" data-n="${i}">Ver más<span class="sr"> sobre ${c.t}</span> ${ic('arrow', 16)}</button>
        </article>`).join('')}
      </div>
    </div>
  </section>`;
}

function About() {
  return `<section class="l-section" id="l-nosotros" aria-labelledby="l-nosotros-t">
    <div class="l-container l-grid l-about">
      <div class="c-12 c-md-4 c-lg-3"><img class="l-round" src="assets/about.svg" alt="Ilustración de una médica veterinaria cargando a un perro" width="260" height="260" loading="lazy"></div>
      <div class="c-12 c-md-8 c-lg-6">
        <h2 class="l-h2 accent" id="l-nosotros-t" tabindex="-1">Sobre VetCitas</h2>
        <p>Nacimos para que llevar a tu mascota al veterinario sea tan simple como enviar un mensaje. Médicos veterinarios, especialistas y personal de la clínica trabajan sobre una misma agenda, y el asistente Vetty se encarga de que cada cita llegue con la información necesaria.</p>
        <p>Así el equipo dedica su tiempo a lo importante: atender bien a cada paciente.</p>
      </div>
      <div class="c-12 c-lg-3 l-about-cta"><a class="btn pri" href="#/registro">Crear mi cuenta ${ic('arrow', 18)}</a></div>
    </div>
  </section>`;
}

function Ventajas() {
  return `<div class="c-12 c-lg-4">
    <h2 class="l-h3">${lTitle('Nuestras', 'ventajas')}</h2>
    <ul class="l-badges">${L_VENTAJAS.map(([v, l, c]) => `<li><span class="l-badge" style="--circle:var(--c-${c})">${v}</span><span>${l}</span></li>`).join('')}</ul>
  </div>`;
}

function ServiciosLista() {
  const sv = db.servicios.filter(s => s.activo);
  return `<div class="c-12 c-md-6 c-lg-4">
    <h2 class="l-h3">${lTitle('Servicios', 'disponibles')}</h2>
    <ul class="l-bullets">${sv.map(s => `<li><span>${esc(s.nombre)}</span><span class="l-dur">${s.duracion} min</span></li>`).join('')}</ul>
  </div>`;
}

function Testimonio(t) {
  return `<blockquote class="l-quote">
    <span class="l-quote-ic" aria-hidden="true">${ic('quote', 22)}</span>
    <p>${t.q}</p>
    <footer><span class="l-avatar" style="--circle:var(--c-${t.c})" aria-hidden="true">${t.n.split(' ').map(w => w[0]).join('')}</span><span><b>${t.n}</b><span class="block">${t.r}</span></span></footer>
  </blockquote>`;
}

function Testimonios() {
  const n = L_TESTIMONIOS.length, i = Landing.testi;
  return `<div class="c-12 c-md-6 c-lg-4" id="l-testimonios">
    <h2 class="l-h3" id="l-testimonios-t" tabindex="-1">${lTitle('Lo que dicen', 'de nosotros')}</h2>
    <div class="l-testi" aria-roledescription="carrusel" aria-labelledby="l-testimonios-t">
      <div id="l-testi-box" aria-live="polite">${Testimonio(L_TESTIMONIOS[i])}</div>
      <div class="l-testi-nav">
        <button type="button" class="l-arrow" data-a="lTesti" data-d="-1" aria-label="Testimonio anterior">${ic('back', 18)}</button>
        <span class="small muted" id="l-testi-n">${i + 1} / ${n}</span>
        <button type="button" class="l-arrow" data-a="lTesti" data-d="1" aria-label="Testimonio siguiente">${ic('chev', 18)}</button>
      </div>
    </div>
  </div>`;
}

function TresColumnas() {
  return `<section class="l-section l-alt" aria-label="Ventajas, servicios y testimonios">
    <div class="l-container l-grid">${Ventajas()}${ServiciosLista()}${Testimonios()}</div>
  </section>`;
}

function Footer() {
  const { lat, lon } = L_MAP, d = 0.006;
  const bbox = [lon - d, lat - d, lon + d, lat + d].map(x => x.toFixed(4)).join('%2C');
  return `<footer class="l-footer" id="l-contacto">
    <div class="l-container l-grid">
      <section class="c-12 c-md-6 c-lg-4" aria-labelledby="l-f1">
        <h2 class="l-fh" id="l-f1" tabindex="-1">Ubicación</h2>
        <div class="l-map"><iframe title="Mapa de la ubicación de la clínica" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&amp;layer=mapnik&amp;marker=${lat}%2C${lon}"></iframe></div>
        <a class="l-flink small" href="https://www.openstreetmap.org/?mlat=${lat}&amp;mlon=${lon}#map=17/${lat}/${lon}" target="_blank" rel="noopener">Ver mapa más grande<span class="sr"> (se abre en otra pestaña)</span></a>
      </section>
      <section class="c-12 c-md-6 c-lg-4" aria-labelledby="l-f2">
        <h2 class="l-fh" id="l-f2">Contacto</h2>
        <ul class="l-contact">
          <li>${ic('pin', 18)}<span>${esc(CLINICA.dir)}</span></li>
          <li>${ic('phone', 18)}<a class="l-flink" href="${CLINICA.telHref}">${esc(CLINICA.tel)}</a></li>
          <li>${ic('mail', 18)}<a class="l-flink" href="mailto:citas@vetcitas.pe">citas@vetcitas.pe</a></li>
        </ul>
        <div class="l-social">
          ${[['fb', 'Facebook'], ['ig', 'Instagram'], ['wa', 'WhatsApp']].map(([i, n]) => `<a href="#/" data-a="lSocial" aria-label="VetCitas en ${n}">${ic(i, 18)}</a>`).join('')}
        </div>
      </section>
      <nav class="c-12 c-lg-4" aria-labelledby="l-f3">
        <h2 class="l-fh" id="l-f3">Enlaces útiles</h2>
        <ul class="l-links">
          <li><a class="l-flink" href="#/login">Reservar una cita</a></li>
          <li><a class="l-flink" href="#/registro">Crear una cuenta</a></li>
          <li><a class="l-flink" href="#/login">Iniciar sesión</a></li>
          <li><a class="l-flink" href="#/" data-a="lGo" data-s="servicios">Nuestros servicios</a></li>
          <li><a class="l-flink" href="#/" data-a="lGo" data-s="nosotros">Sobre nosotros</a></li>
        </ul>
      </nav>
    </div>
  </footer>`;
}

function BottomBar() {
  return `<div class="l-bottom">
    <div class="l-container l-bottom-in">
      <p>© ${new Date().getFullYear()} VetCitas. Maqueta con datos ficticios.</p>
      <button type="button" class="l-flink" data-a="lPrivacy">Política de privacidad</button>
    </div>
  </div>`;
}

/* ---------- Página ---------- */
Landing.page = () => {
  Landing.stop();
  Landing.slide = 0;
  App.render(`<div class="landing">${LandingHeader()}<main id="main">${Hero()}${Slogan()}${ServiceCards()}${About()}${TresColumnas()}</main>${Footer()}${BottomBar()}</div>`);
  Landing.paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  Landing.syncPlay();
  Landing.play();
  Landing.watch();
};
Landing.stop = () => {
  clearInterval(Landing.timer);
  Landing.timer = null;
  Landing.obs?.disconnect();
  Landing.obs = null;
};
Landing.play = () => {
  clearInterval(Landing.timer);
  if (Landing.paused) return;
  Landing.timer = setInterval(() => {
    if (!document.querySelector('.l-hero')) return Landing.stop();
    const hero = document.querySelector('.l-hero');
    if (hero.matches(':hover') || hero.contains(document.activeElement)) return;
    Landing.show((Landing.slide + 1) % L_SLIDES.length);
  }, 6000);
};
Landing.show = i => {
  Landing.slide = i;
  document.querySelectorAll('.l-slide').forEach((s, k) => {
    const on = k === i;
    s.classList.toggle('on', on);
    s.toggleAttribute('inert', !on);
    if (on) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
  });
  document.querySelectorAll('.l-dot').forEach((d, k) => {
    d.classList.toggle('on', k === i);
    if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
  });
};
Landing.syncPlay = () => {
  const b = document.querySelector('.l-play');
  if (!b) return;
  b.innerHTML = ic(Landing.paused ? 'play' : 'pause', 14);
  b.setAttribute('aria-label', Landing.paused ? 'Reanudar el carrusel' : 'Pausar el carrusel');
};
/* Resalta la pestaña de la sección visible al desplazarse. */
Landing.watch = () => {
  if (!('IntersectionObserver' in window)) return;
  Landing.obs = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach(e => Landing.setTab(e.target.id.replace('l-', '')));
  }, { rootMargin: '-45% 0px -50% 0px' });
  L_NAV.forEach(([id]) => { const el = document.getElementById('l-' + id); if (el) Landing.obs.observe(el); });
};
Landing.setTab = id => document.querySelectorAll('.l-tab').forEach(t => {
  const on = t.dataset.s === id;
  t.classList.toggle('on', on);
  if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
});
const lMenuOpen = open => {
  const b = document.querySelector('.l-burger');
  if (!b) return;
  b.setAttribute('aria-expanded', String(open));
  b.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  document.querySelector('.l-nav').classList.toggle('open', open);
};

/* ---------- Acciones ---------- */
ACT.lGo = el => {
  const id = el.dataset.s, target = document.getElementById('l-' + id);
  lMenuOpen(false);
  if (!target) return;
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (id === 'inicio') window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  else target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  Landing.setTab(id);
  (target.querySelector('[tabindex="-1"]') || document.querySelector('.landing h1'))?.focus({ preventScroll: true });
};
ACT.lMenu = el => lMenuOpen(el.getAttribute('aria-expanded') !== 'true');
ACT.lSlide = el => { Landing.show(Number(el.dataset.n)); Landing.play(); };
ACT.lPause = () => { Landing.paused = !Landing.paused; Landing.syncPlay(); Landing.play(); };
ACT.lTesti = el => {
  const n = L_TESTIMONIOS.length;
  Landing.testi = (Landing.testi + Number(el.dataset.d) + n) % n;
  document.getElementById('l-testi-box').innerHTML = Testimonio(L_TESTIMONIOS[Landing.testi]);
  document.getElementById('l-testi-n').textContent = `${Landing.testi + 1} / ${n}`;
};
ACT.lMore = el => {
  const c = L_CARDS[Number(el.dataset.n)];
  openModal(`${modalHead(c.t)}<p class="muted">${c.more}</p>
    <div class="modal-actions"><button type="button" class="btn sec" data-a="modalClose">Cerrar</button><a class="btn pri" href="#/registro">Empezar ahora</a></div>`);
};
ACT.lSocial = () => toast('En la maqueta las redes sociales son enlaces de ejemplo.', 'info');
ACT.lPrivacy = () => openModal(`${modalHead('Política de privacidad')}
  <p class="muted">Tratamos tus datos personales conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, solo para gestionar tus citas, enviarte recordatorios y compartir con tu veterinario la información que nos des sobre tu mascota.</p>
  <p class="muted mt12">Esta es una maqueta: los datos se guardan únicamente en tu navegador y no se envían a ningún servidor. No ingreses datos personales reales.</p>
  <div class="modal-actions"><button type="button" class="btn pri" data-a="modalClose">Entendido</button></div>`);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.querySelector('.l-nav.open') && !modalOpen()) { lMenuOpen(false); document.querySelector('.l-burger').focus(); }
});
