# VetCitas · Maqueta funcional

Maqueta funcional (solo frontend) del **módulo de control de citas automatizadas** desde la perspectiva de los médicos veterinarios y de los dueños de mascotas. Sirve para mostrar el sistema al público y para la evaluación de usabilidad con el cuestionario SUS.

Se construyó a partir de los entregables de diseño: ERS (2.2), matriz de trazabilidad (2.3), arquitectura (3.1), modelo de datos (3.2) y prototipos P01–P10 (3.3). Todos los datos son ficticios.

## Cómo abrirla

- La interfaz es responsiva: en el celular usa navegación inferior y en escritorio una barra lateral (probada de 360 a 1920 px).
- **En una computadora:** doble clic en `index.html`. No necesita instalación ni internet (sin conexión usa una tipografía del sistema).
- **En línea (GitHub Pages):** en el repositorio, *Settings → Pages → Deploy from a branch → `main` / raíz*. La maqueta queda disponible en `https://<usuario>.github.io/NEGOCIOS-IA/` y se puede abrir desde el celular.

## Cuentas de prueba

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Dueño de mascota | lucia.paredes@correo.pe | Lucia2026 |
| Médico veterinario | carlos.rojas@vetcitas.pe | Vet12345 |
| Médica veterinaria (dermatología) | laura.castillo@vetcitas.pe | Vet12345 |
| Administrador | admin@vetcitas.pe | Admin2026 |

La pantalla de inicio de sesión muestra estas cuentas con un botón «Usar». También se puede crear una cuenta nueva de dueño.

## Asistente con IA para el dueño de mascota («Vetty»)

El apartado del dueño gira en torno a un asistente conversacional que personaliza cada cita:

| Función | Qué hace |
| --- | --- |
| Triage médico virtual | Pregunta desde cuándo, signos de alarma y apetito; asigna prioridad alta o normal y explica por qué. |
| Detección de emergencias | Si detecta código rojo (dificultad para respirar, convulsiones, encías pálidas, intoxicación…), frena el agendamiento, muestra el teléfono de emergencias y alerta a la clínica. La alerta aparece en la agenda del veterinario y en el panel del administrador. |
| Derivación al especialista | Clasifica el área (dermatología, traumatología, gastroenterología, otología…) y propone al veterinario que atiende esa área. |
| Agendamiento predictivo | Ajusta servicio y duración al paciente (vacuna de 15 min, especialidad de 40 min, consulta felina tranquila de 40 min) y, para gatos, elige horarios con pocos perros en la sala de espera. |
| Recomendaciones del historial | Detecta refuerzos de vacunas, desparasitaciones, controles indicados por el veterinario y chequeos geriátricos; avisa en la bandeja y propone tres horarios para agendar con un toque. |
| Cotización dinámica | Calcula esterilización o limpieza dental con el peso, la edad y el sexo de la mascota, incluidos los exámenes prequirúrgicos, y ofrece agendar la valoración. |
| Foto y voz | Recibe fotos de la lesión y transcribe notas de voz (dictado del navegador, en Chrome y Edge). |
| Resumen para el veterinario | Cada cita agendada con el asistente lleva un resumen con síntomas, respuestas, fotos y transcripción; el veterinario lo lee en el detalle de la cita antes de atender. |

**Sobre la IA en esta maqueta:** al ser solo frontend, la inteligencia se simula en el navegador con un motor de reglas y palabras clave (`js/ia.js`). Así funciona sin internet, siempre responde igual ante las mismas entradas (útil para la evaluación de usabilidad) y no expone claves de API. En el sistema real, el mismo flujo se conectaría a un modelo de lenguaje y a un servicio de visión por computadora desde el backend.

Para probarlo, escribe por ejemplo: «Rocky vomitó desde ayer y no quiere comer», «mi gata está estresada y se esconde», «¿cuánto cuesta esterilizar a Mishi?» o «Rocky está convulsionando».

## Qué se puede hacer

| Rol | Funciones | Requisitos |
| --- | --- | --- |
| Dueño de mascota (celular y escritorio) | Asistente IA (ver arriba), crear cuenta con consentimiento de datos, registrar y editar mascotas, reservar en 4 pasos con horas libres reales, reprogramar y cancelar hasta 2 h antes, recibir recordatorios por correo o SMS simulados y confirmar la asistencia desde el enlace, ver el historial de cada mascota | RF01–RF09, RF14 |
| Médico veterinario (escritorio y tablet) | Alertas de emergencia del asistente IA, resumen previo de la IA en cada cita, agenda diaria y semanal con colores por estado, refrigerio, bloqueos y hora actual; registrar la atención, la inasistencia y las observaciones; definir el horario semanal; registrar bloqueos con aviso de citas afectadas; buscar el historial de pacientes | RF10–RF14 |
| Administrador (escritorio y tablet) | Indicadores del asistente IA (citas agendadas, prioridades, derivaciones, emergencias), áreas de atención de cada veterinario para la derivación, indicadores del mes, citas por estado, detalle por veterinario, descarga del reporte en CSV, gestión de servicios y su duración, alta y desactivación de cuentas de veterinarios, agenda general | RF11, RF15–RF17 |

Reglas de negocio aplicadas: sin cruces de horario por veterinario ni por mascota (RN01, RN06), duración según el servicio (RN02), plazo de 2 h para cambios (RN03), recordatorios de 24 h y 2 h (RN04) y aviso de tolerancia de 15 min (RN05).

## Notas para la evaluación

- Los datos se guardan en el navegador (`localStorage`); cada participante puede empezar de cero con **«Reiniciar datos de la demo»** en la pantalla de inicio de sesión.
- El dictado por voz necesita permiso de micrófono y funciona en Chrome o Edge (en GitHub Pages, por ser HTTPS).
- Los recordatorios llegan solos 24 h y 2 h antes. Para probarlos al momento, en **Avisos** está la opción «simula el siguiente recordatorio».
- Se puede abrir una pestaña como dueño y otra como veterinario: una reserva hecha en una aparece en la agenda de la otra.
- Es una maqueta: no hay servidor, las contraseñas no se cifran y no se envían correos ni SMS reales. No ingresar datos personales reales.

## Estructura

```text
index.html        Punto de entrada
css/styles.css    Estilos (guía de estilo de los prototipos, responsivo de 360 a 1920 px)
js/util.js        Fechas y formatos
js/store.js       Base de datos simulada, reglas de negocio y datos de ejemplo
js/ui.js          Componentes compartidos (iconos, modales, avisos)
js/auth.js        Inicio de sesión y registro
js/ia.js          Motor del asistente IA (triage, derivación, horarios, recomendaciones, cotización)
js/asistente.js   Chat del asistente IA (texto, foto y voz)
js/owner.js       Vista del dueño de mascota
js/agenda.js      Agenda y detalle de cita
js/vet.js         Horario, bloqueos e historial de pacientes
js/admin.js       Panel de administración
js/app.js         Rutas, sesión y arranque
```
