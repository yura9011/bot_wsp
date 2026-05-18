# Human Dashboard Baseline

> Baseline funcional del dashboard humano actual.
> Prueba realizada en testing/demo, no en Santa Ana producción.
> Fecha: 2026-05-18.

## Contexto

Se validó el dashboard humano usando `demo-local` y el panel `http://2.24.89.243:5011`.

No se probó el panel productivo `3001` con clientes reales. La prueba se hizo con número demo para evitar tocar conversaciones productivas.

## Validado

- Login al panel demo.
- Lista de chats cargada.
- Conversación entrante visible en `Chats`.
- Mensajes del bot visibles en la conversación.
- Envío de mensaje humano desde el input del panel.
- El mensaje humano llegó al WhatsApp cliente.
- Bot volvió a responder cuando el cliente escribió después.

Prueba observada:

- Cliente envió: `hola prueba panel`.
- Bot respondió el flujo demo.
- Operador envió desde panel: `Mensaje humano de prueba desde el panel.`
- Botón rápido `MUCHAS GRACIAS` envió ese texto al cliente.
- Cliente envió: `gracias`.
- Bot respondió automáticamente con la respuesta demo de cierre.

## Comportamiento Real Del Panel

El panel actual permite responder manualmente desde el dashboard, pero no muestra controles explícitos para gestionar handoff.

Controles visibles:

- Input de mensaje.
- Botón `Enviar`.
- Botón rápido `MUCHAS GRACIAS`.
- Estado visual `ESPERANDO`.

Endpoints existentes observados en código:

- `POST /api/chats/:userId/message`: envía mensaje humano usando Bot API.
- `POST /api/chats/:userId/finish`: envía `MUCHAS GRACIAS` usando Bot API.

## Gap Detectado

El gap original era que no había controles visibles para:

- Tomar conversación.
- Pausar bot para un chat desde el dashboard.
- Reanudar bot para un chat desde el dashboard.
- Finalizar handoff real y devolver explícitamente al bot.

## Handoff Formal Implementado

Fecha: 2026-05-18.

Se agregó el flujo formal en `dashboard-humano-v2`:

- Botón `Tomar conversación`: pausa el bot para ese chat usando `POST /pause/:userId` con razón `atendido_desde_dashboard`.
- Botón `Devolver al bot`: reanuda el bot usando `POST /resume/:userId`.
- Estado visible por chat: `Bot activo`, `Esperando humano`, `Atendido por humano`.
- El botón `MUCHAS GRACIAS` ahora envía el mensaje final y además reanuda el bot.

El botón `MUCHAS GRACIAS` sigue siendo una respuesta rápida; el handoff formal lo definen `Tomar conversación` y `Devolver al bot`.

## Implicancia Para Asturias

Asturias puede operar con atención humana básica desde el panel actual si se acepta este comportamiento simple.

Para Asturias, el panel debe validarse con el flujo formal durante el alta:

- botón `Tomar conversación`;
- estado `Atendido por humano`;
- botón `Devolver al bot`;
- persistencia en `pausas.json`;
- feedback claro en UI.

## Recomendación

Antes de usar el panel para atención diaria intensiva, validar el handoff formal en el entorno que corresponda al alta. Para MVP comercial, el panel permite responder manualmente y administrar pausa/reanudación por chat.
