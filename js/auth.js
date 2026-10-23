'use strict';
/* P01 Inicio de sesión (RF02) y P02 Registro del dueño (RF01, RNF05). */
const Auth = {};
const DEMO = [
  ['Dueño de mascota', 'lucia.paredes@correo.pe', 'Lucia2026'],
  ['Médico veterinario', 'carlos.rojas@vetcitas.pe', 'Vet12345'],
  ['Administrador', 'admin@vetcitas.pe', 'Admin2026'],
];
const pwField = (id, name, auto) => `<div class="pw"><input class="input" id="${id}" name="${name}" type="password" autocomplete="${auto}"><button type="button" data-a="togglePass" aria-label="Mostrar contraseña">${ic('eye', 20)}</button></div>`;
const authShell = (body, top = '') => `<div class="m-shell"><div class="m-app">${top}<main class="m-content" id="main">${body}</main></div></div>`;

Auth.login = () => {
  App.render(authShell(`
    <div class="auth-logo">${ic('paw', 34)}</div>
    <h1 class="mt16" tabindex="-1">VetCitas</h1>
    <p class="muted mt4">Reserva y controla las citas de tu mascota desde tu celular.</p>
    <form class="mt24" data-f="login" novalidate>
      <div id="login-err"></div>
      <div class="field"><label for="l-c">Correo electrónico</label><input class="input" id="l-c" name="correo" type="email" inputmode="email" autocomplete="username" placeholder="tucorreo@ejemplo.com"></div>
      <div class="field"><label for="l-p">Contraseña</label>${pwField('l-p', 'pass', 'current-password')}</div>
      <div class="row" style="justify-content:flex-end;margin:-6px 0 12px"><button type="button" class="btn link" data-a="forgot">¿Olvidaste tu contraseña?</button></div>
      <button class="btn pri block">Iniciar sesión</button>
    </form>
    <div class="divider">o</div>
    <a class="btn sec block" href="#/registro">Crear cuenta nueva</a>
    <p class="xs muted center mt16">Médicos veterinarios y personal ingresan con la misma pantalla; el sistema muestra las opciones según el rol.</p>
    <section class="card demo" aria-labelledby="demo-t">
      <h2 id="demo-t" class="h3">Cuentas de prueba</h2>
      <p class="xs muted mt4">Toca «Usar» para completar el formulario con una cuenta ficticia.</p>
      ${DEMO.map(([rol, c, p]) => `<div class="demo-row"><div class="grow min0"><p class="small"><b>${rol}</b></p><p class="xs muted ellip">${c} · ${p}</p></div><button type="button" class="btn sm sec" data-a="demoFill" data-c="${c}" data-p="${p}">Usar</button></div>`).join('')}
      <button type="button" class="btn link red mt8" data-a="resetDemo">${ic('refresh', 16)} Reiniciar datos de la demo</button>
    </section>`, ''));
};

SUBMIT.login = f => {
  const box = document.getElementById('login-err');
  const errs = {};
  if (!f.correo.value.trim()) errs.correo = 'Escribe tu correo electrónico.';
  if (!f.pass.value) errs.pass = 'Escribe tu contraseña.';
  box.innerHTML = '';
  if (!setErrors(f, errs)) return;
  const u = Q.userByEmail(f.correo.value);
  let msg = '';
  if (!u || u.pass !== f.pass.value) msg = 'El correo o la contraseña no son correctos. Revisa e inténtalo de nuevo.';
  else if (!u.activo) msg = 'Tu cuenta está desactivada. Comunícate con la clínica.';
  if (msg) {
    box.innerHTML = `<div class="note err mb12" role="alert">${ic('alert', 18)}<span>${msg}</span></div>`;
    f.pass.focus();
    return;
  }
  App.startSession(u);
  toast(`Hola, ${u.nombres.split(' ')[0]}.`);
};

ACT.demoFill = el => {
  const f = document.querySelector('form[data-f="login"]');
  f.correo.value = el.dataset.c;
  f.pass.value = el.dataset.p;
  setErrors(f, {});
  document.getElementById('login-err').innerHTML = '';
  f.querySelector('button.pri').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
ACT.togglePass = el => {
  const i = el.parentElement.querySelector('input'), show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  el.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  el.innerHTML = ic(show ? 'eyeOff' : 'eye', 20);
};
ACT.forgot = () => {
  const c = document.getElementById('l-c')?.value || '';
  openModal(`${modalHead('Recuperar contraseña')}
    <p class="small muted mb16">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.</p>
    <form data-f="forgot" novalidate><div class="field"><label for="f-c">Correo electrónico</label><input class="input" id="f-c" name="correo" type="email" inputmode="email" value="${esc(c)}"></div>
    <button class="btn pri block">Enviar enlace</button></form>`);
};
SUBMIT.forgot = f => {
  if (!setErrors(f, EMAIL_RE.test(f.correo.value.trim()) ? {} : { correo: 'Ingresa un correo válido.' })) return;
  closeModal();
  toast('Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.', 'info');
};
ACT.resetDemo = async () => {
  const ok = await confirmBox({ title: '¿Reiniciar la demo?', text: 'Se borrarán las cuentas, mascotas y citas creadas durante las pruebas y se cargarán otra vez los datos de ejemplo.', ok: 'Sí, reiniciar', danger: true });
  if (!ok) return;
  Store.reset();
  Session.clear();
  toast('Datos de la demo reiniciados.');
  App.refresh();
};

Auth.registro = () => {
  App.render(authShell(`
    <form data-f="registro" novalidate>
      <div class="row gap8 top"><div class="field grow"><label for="r-n">Nombres</label><input class="input" id="r-n" name="nombres" autocomplete="given-name" maxlength="60"></div>
      <div class="field grow"><label for="r-a">Apellidos</label><input class="input" id="r-a" name="apellidos" autocomplete="family-name" maxlength="60"></div></div>
      <div class="field"><label for="r-c">Correo electrónico</label><input class="input" id="r-c" name="correo" type="email" inputmode="email" autocomplete="email" maxlength="120" placeholder="tucorreo@ejemplo.com"></div>
      <div class="field"><label for="r-t">Celular</label><input class="input" id="r-t" name="telefono" type="tel" inputmode="numeric" autocomplete="tel" maxlength="11" placeholder="987 654 321"></div>
      <div class="field"><label for="r-p">Contraseña (mínimo 8 caracteres)</label>${pwField('r-p', 'pass', 'new-password')}</div>
      <fieldset class="field"><legend>Recibir recordatorios por</legend><div class="row gap8">
        <label class="opt"><input type="radio" name="canal" value="CORREO" checked>${ic('mail', 18)} Correo</label>
        <label class="opt"><input type="radio" name="canal" value="SMS">${ic('msg', 18)} SMS</label></div></fieldset>
      <div class="field"><label class="check"><input type="checkbox" name="acepta"><span>Acepto el tratamiento de mis datos personales conforme a la Ley N.° 29733 para la gestión de mis citas.</span></label></div>
      <button class="btn pri block">Crear cuenta</button>
      <p class="small muted center mt16">¿Ya tienes cuenta? <a href="#/login"><b>Inicia sesión</b></a></p>
    </form>`, `<header class="m-top"><a class="back" href="#/login" aria-label="Volver">${ic('back', 20)}</a><h1 tabindex="-1">Crear cuenta</h1></header>`));
};

SUBMIT.registro = f => {
  const v = k => f[k].value.trim(), tel = v('telefono').replace(/\D/g, ''), errs = {};
  if (v('nombres').length < 2) errs.nombres = 'Escribe tus nombres.';
  if (v('apellidos').length < 2) errs.apellidos = 'Escribe tus apellidos.';
  if (!EMAIL_RE.test(v('correo'))) errs.correo = 'Ingresa un correo válido, por ejemplo nombre@correo.com.';
  else if (Q.userByEmail(v('correo'))) errs.correo = 'Ya existe una cuenta con este correo. Inicia sesión.';
  if (!/^9\d{8}$/.test(tel)) errs.telefono = 'Ingresa un celular de 9 dígitos que empiece con 9.';
  if (f.pass.value.length < 8) errs.pass = 'La contraseña debe tener al menos 8 caracteres.';
  if (!f.acepta.checked) errs.acepta = 'Debes aceptar el tratamiento de datos para crear tu cuenta.';
  if (!setErrors(f, errs)) return;
  const u = insert('usuarios', {
    nombres: v('nombres'), apellidos: v('apellidos'), correo: v('correo').toLowerCase(), telefono: fmtTel(tel), pass: f.pass.value,
    rol: 'DUENO', acepta_datos: true, activo: true, creado_en: nowISO(),
  });
  insert('duenos', { id_usuario: u.id, dni: null, direccion: '', canal: f.canal.value });
  Store.save();
  App.startSession(u);
  toast(`¡Listo, ${u.nombres.split(' ')[0]}! Tu cuenta fue creada. Ahora registra a tu mascota.`);
};
