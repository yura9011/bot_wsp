# Santa Ana Production Baseline

> Baseline read-only del estado productivo de Santa Ana antes de integrarlo al Dashboard Maestro o a la estructura multi-tenant.
> Fecha: 2026-05-17.

## Objetivo

Registrar el estado actual del panel humano y bot productivo de Santa Ana sin modificar procesos, configuración ni runtime data.

Esta baseline sirve como referencia antes de cualquier integración read-only con Dashboard Maestro.

## Alcance

- Producción real: `/home/forma/bot_dolce`.
- Bot PM2: `bot-dolce-prd`.
- Dashboard humano PM2: `dashboard-humano-santa-ana`.
- Dashboard humano externo: `http://2.24.89.243:3001/index.html`.
- Bot API interno: `http://127.0.0.1:3011/status`.

No se modificó producción.

## Verificación Read-Only

### PM2

`dashboard-humano-santa-ana`:
- Estado: `online`.
- Script: `/home/forma/bot_dolce/dashboard-humano-v2/server.js`.
- CWD: `/home/forma/bot_dolce/dashboard-humano-v2`.
- Uptime observado: `5D`.
- Restarts observados: `17`.

`bot-dolce-prd`:
- Estado: `online`.
- Script: `/home/forma/bot_dolce/orchestrator.js`.
- CWD: `/home/forma/bot_dolce`.
- Uptime observado: `4D`.
- Restarts observados: `25`.

### HTTP

Dashboard humano Santa Ana:

```text
GET http://127.0.0.1:3001/index.html
HTTP 200 OK
Content-Type: text/html; charset=UTF-8
```

Bot API Santa Ana:

```json
{
  "agentId": "santa-ana",
  "name": "Dolce Party - Santa Ana",
  "isRunning": true,
  "globalPausado": false,
  "usuariosPausados": 0
}
```

### Observación Visual

El usuario compartió captura del panel `http://2.24.89.243:3001/index.html` autenticado como `Administrador`, con:

- Header `Dolce Party - Santa Ana`.
- Tabs visibles: `Chats`, `Config`, `Stats`.
- Lista de chats cargada.
- Conversación abierta con estado `ESPERANDO`.

Esto confirma carga visual del panel, pero no reemplaza pruebas manuales de acciones.

## Pruebas Manuales Pendientes

Antes de integrar Santa Ana al Maestro como producción read-only, validar manualmente:

- Login/logout del panel humano `3001`.
- Carga de `Chats`.
- Apertura de conversación.
- Envío de mensaje humano desde el panel.
- Finalización de conversación.
- Vista `Config`.
- CRUD de admin/ignored numbers solo si se decide probar con backup previo.
- Vista `Stats`.
- WebSocket/notificaciones en vivo.

## Integración Read-Only Recomendada

Para Dashboard Maestro, Santa Ana debe incorporarse primero como:

```text
clientId: dolce-party
agentId: santa-ana
environment: production
botApi: 127.0.0.1:3011
humanDashboard: 127.0.0.1:3001
pm2.bot: bot-dolce-prd
pm2.dashboard: dashboard-humano-santa-ana
controlEnabled: false
backupEnabled: false
readOnly: true
```

## Guardrails

- No mover `data/santa-ana/`.
- No mover `.wwebjs_auth/`.
- No cambiar PM2 productivo.
- No habilitar PM2 control productivo.
- No ejecutar backup-now productivo desde Maestro sin confirmación explícita.
- No exponer acciones destructivas sobre Santa Ana en el Maestro durante la primera integración.

