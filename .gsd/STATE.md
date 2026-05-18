# Project State

> Last updated: 17/05/2026

## Last Session Summary

Sesión handoff formal dashboard humano:

- Implementación en `dashboard-humano-v2` para demo/testing.
- Controles agregados al panel: `Tomar conversación`, `Devolver al bot`, se mantiene `Enviar` y `MUCHAS GRACIAS`.
- `Tomar conversación` usa Bot API `POST /pause/:userId` con razón `atendido_desde_dashboard`.
- `Devolver al bot` usa Bot API `POST /resume/:userId`.
- `POST /api/chats/:userId/finish` ahora envía `MUCHAS GRACIAS` y reanuda el bot.
- Estados visibles por chat: `Bot activo`, `Esperando humano`, `Atendido por humano`.
- Validación local: `node --check` OK en `dashboard-humano-v2/server.js`, `conversation.js`, `chat-list.js` y `lib/agent-manager.js`.
- Producción no fue tocada. Pendiente deploy/validación en `bot_testing` si este commit aún no está en VPS.

## Last Session Summary (anterior)

Sesión baseline dashboard humano:

- Prueba realizada en `demo-local` / dashboard `5011`, no en producción.
- Validado: carga de chats, conversación visible, mensajes del bot visibles, envío humano desde panel y llegada al WhatsApp cliente.
- Botón `MUCHAS GRACIAS` validado como respuesta rápida; envía texto al cliente.
- Después del mensaje del cliente `gracias`, el bot volvió a responder automáticamente.
- Gap documentado: no hay controles visibles de tomar conversación, pausar bot para chat, reanudar bot ni finalizar handoff real.
- Nuevo documento: `.gsd/milestones/multi-tenant-architecture/HUMAN_DASHBOARD_BASELINE.md`.

## Last Session Summary (anterior)

Sesión preparación backup Maestro, onboarding y exposición:

- `scripts/backup-production.sh` agregado para backup productivo desde Maestro con guardrails:
  - solo acepta `PROD_DIR=/home/forma/bot_dolce`
  - guarda en `/home/forma/backups-prod`
  - valida el `.tar.gz` con `tar -tzf`
  - no está habilitado por env ni ejecutado desde Maestro.
- Checklist reusable agregado: `.gsd/milestones/multi-tenant-architecture/AGENT_ONBOARDING_CHECKLIST.md`.
- Plan de exposición segura agregado: `.gsd/milestones/multi-tenant-architecture/MAESTRO_EXPOSURE_PLAN.md`.
- Pendiente para exponer Maestro: dominio/subdominio, usuarios autorizados y decisión de auth.

## Last Session Summary (anterior)

Sesión Maestro pending QR:

- Dashboard Maestro soporta `statusOverrides` en `config/agents.override.json`.
- Estado `pending-qr` muestra el agente como pendiente de escaneo QR, sin health real, sin acciones y sin alertas.
- Uso previsto inmediato: `asturias` queda visible como pendiente QR en testing hasta la semana de alta.
- Para iniciar alta real, quitar `statusOverrides.asturias = "pending-qr"` y habilitar el agente solo durante la prueba/QR.

## Last Session Summary (anterior)

Sesión preconfig Asturias y cierre rutas Fase 1:

- Rutas productivas Santa Ana registradas por SSH read-only:
  - repo: `/home/forma/bot_dolce`
  - auth: `/home/forma/bot_dolce/.wwebjs_auth/session-santa-ana-session`
  - data: `/home/forma/bot_dolce/data/santa-ana`
  - logs: `/home/forma/bot_dolce/logs/santa-ana`
  - catalog: `/home/forma/bot_dolce/catalogs/catalogo-santa-ana.js`
  - dashboard: `/home/forma/bot_dolce/dashboard-humano-v2`
- PM2 productivo registrado: `bot-dolce-prd` ejecuta `/home/forma/bot_dolce/orchestrator.js`; `dashboard-humano-santa-ana` ejecuta `/home/forma/bot_dolce/dashboard-humano-v2/server.js`.
- Asturias preconfigurado en `config/agents.json` con teléfono `5493513114575` y dirección `Sta. Ana 2637, X5010EEK Córdoba`.
- QR Asturias, PM2 nuevo y operación comercial siguen pendientes.

## Last Session Summary (anterior)

Sesión Fase 1 Santa Ana y Asturias pendiente:

- Backup manual productivo de `/home/forma/bot_dolce` creado en `/home/forma/backups-prod/bot_dolce-pre-maestro-20260517-232344.tar.gz`.
- Tamaño final: `406900359 bytes` (~389 MB).
- Validación: `tar tzf` devolvió `TAR_OK`.
- Producción quedó online después del backup: `bot-dolce-prd` online, `dashboard-humano-santa-ana` online, `3011/status` OK, `3001/index.html` HTTP `200`.
- No se reiniciaron ni modificaron procesos productivos.
- Asturias queda pendiente para la semana: número real `5493513114575`, QR pendiente, sin PM2 nuevo, sin operación comercial todavía. Por ahora usará datos base compartidos con Santa Ana y catálogo `catalogs/catalogo-santa-ana.js`.

## Last Session Summary (anterior)

Sesión cierre Fase 0 testing multi-tenant:

- PM2 control real probado desde Dashboard Maestro en `bot_testing`.
- Acción ejecutada: `restart bot` sobre `demo-local`; target PM2 `bot-demo-local`.
- Resultado: auditoría persistente `success` con `processName: bot-demo-local`.
- Post-check OK: `bot-demo-local` online, `/status` `isRunning=true`, WhatsApp `connected`, dashboard demo `5011` responde HTTP `200`.
- Excepción documentada: el dashboard demo no tiene PM2 separado; corre como hijo de `bot-demo-local`. Si se quiere reiniciar solo `5011`, hay que crear PM2 separado o una capa explícita para el proceso hijo.
- `santa-ana-prod` siguió `readOnly=true`, health OK; no se ejecutaron acciones PM2 ni cambios sobre producción.
- `TESTING_CHECKLIST.md` y checklist Santa Ana actualizados: Fase 0 cerrada para testing.

## Last Session Summary (anterior)

Sesión mejora read-only Santa Ana:

- Maestro ahora soporta `paths.stats` y `paths.pauses` para agentes read-only con archivos absolutos.
- En VPS testing, `santa-ana-prod` lee:
  - stats: `/home/forma/bot_dolce/data/estadisticas.json`
  - pauses: `/home/forma/bot_dolce/data/pausas.json`
- Métricas y handoffs de `santa-ana-prod` ya no muestran archivo no encontrado.
- Como `/status` de producción no expone `whatsapp.status`, Maestro muestra `running` cuando `isRunning=true`.
- Producción intacta; solo lectura desde Maestro.

## Last Session Summary (anterior)

Sesión integración Santa Ana read-only en Maestro:

- Dashboard Maestro testing ahora soporta `additionalAgents` en `config/agents.override.json`.
- Se agregó `santa-ana-prod` solo en override de VPS testing, sin crear config activa en producción.
- `santa-ana-prod` aparece como `dolce-party`, `production`, `readOnly=true`.
- Health desde Maestro OK: bot API `3011` up, dashboard humano `3001` up, overall `ok`.
- UI muestra banner `Testing · demo + Santa Ana producción read-only`, badges de entorno y link `Abrir panel`.
- `pm2-control` bloquea acciones para agentes `readOnly`.
- Prueba de acción PM2 sobre `santa-ana-prod` fue rechazada y auditada: `Agente read-only: acciones PM2 deshabilitadas`.
- Producción intacta: `bot-dolce-prd` y `dashboard-humano-santa-ana` siguieron online.

## Last Session Summary (anterior)

Sesión baseline producción Santa Ana read-only:

- Se validó sin modificar producción que `dashboard-humano-santa-ana` está online en PM2.
- `dashboard-humano-santa-ana` ejecuta `/home/forma/bot_dolce/dashboard-humano-v2/server.js` con CWD `/home/forma/bot_dolce/dashboard-humano-v2`.
- `bot-dolce-prd` está online y ejecuta `/home/forma/bot_dolce/orchestrator.js`.
- `GET http://127.0.0.1:3001/index.html` responde `HTTP 200 OK`.
- `GET http://127.0.0.1:3011/status` responde `agentId: santa-ana`, `isRunning: true`, `globalPausado: false`.
- Captura del usuario confirma panel visual cargado con `Chats`, `Config`, `Stats` y conversación abierta.
- Se creó `.gsd/milestones/multi-tenant-architecture/SANTA_ANA_PRODUCTION_BASELINE.md`.
- Producción quedó intacta. Próximo paso: integrar Santa Ana al Maestro como read-only, no reemplazar panel `3001`.

## Last Session Summary (anterior)

Sesión crítica Dashboard Maestro testing:

- PM2 control habilitado solo en `dashboard-maestro-testing` (`DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL=true`, `DASHBOARD_MAESTRO_PM2_ENV=testing`).
- `processOverrides.demo-local.bot = bot-demo-local` agregado en `/home/forma/bot_testing/config/agents.override.json`.
- Validación PM2: `dashboard-dev` no es dashboard humano demo; ejecuta `dashboard-central.js`.
- El dashboard humano demo en puerto `5011` corre como proceso hijo de `bot-demo-local`, no como PM2 separado. Por eso no se configuró `processOverrides.demo-local.dashboard`.
- Prueba segura PM2: `restart dashboard` para `demo-local` quedó auditado como error esperado porque `dashboard-humano-demo-local-testing` no existe. No se tocó `bot-demo-local`.
- Backup-now testing ejecutado 2 veces más: `bot_testing-20260517-212752.tar.gz` y `bot_testing-20260517-212810.tar.gz`. Total validado: 3 backups exitosos.
- Persistencia Maestro validada en VPS: audit events y maintenance mutes sobreviven reinicio de `dashboard-maestro-testing`.
- Mute de prueba `demo-local` fue removido; `maintenance-mutes.json` quedó vacío (`[]`).
- Producción intacta.

## Last Session Summary (anterior)

Sesión de implementación local demo comercial neutral:

- `demo-local` ahora tiene flujo propio en `lib/agent-manager.js`.
- `flujos.js` agrega mensajes de demo: inicio informativo, respuesta de muestra y cierre.
- El demo queda limitado a una ronda corta: informa que no es tienda real, recibe una consulta de ejemplo y cierra.
- `config/agents.json` quita la referencia "Dolce Party" del texto de dirección/info del demo.
- Deploy realizado en `bot_testing` VPS: se copiaron `flujos.js`, `lib/agent-manager.js` y `config/agents.json`; se reinició solo `bot-demo-local`.
- Verificación VPS: sintaxis OK, PM2 `bot-demo-local` online, `/status` en puerto `5010` responde `whatsapp.status: connected`.
- Prueba manual WhatsApp OK con `11 7145-8944`: primer mensaje informa demo, segundo responde muestra y cierra, tercero indica demo finalizada.
- No se tocó runtime ni producción.

## Last Session Summary (anterior)

Sesión de documentación modelo tenant y checklist migración Santa Ana:

- **TENANT_MODEL.md**: documento del modelo `cliente -> agente/local` con campos, relación y ejemplo Dolce Party.
- **SANTA_ANA_MIGRATION_CHECKLIST.md**: checklist en 5 fases (0-4) para integrar Santa Ana producción al Maestro sin migrar datos.
- **Config futura no activa**: `multi-tenant/clients/README.md` explica la estructura futura; `dolce-party.example.json` es ejemplo conceptual (`.example.json` para que el Maestro no lo lea).
- **Milestone README actualizado** con enlaces a los nuevos documentos.
- **Sin cambios de código, runtime ni producción.**

Pendiente inmediato: completar Fase 0 del checklist (PM2 control probado en testing) para desbloquear integración Santa Ana.

## Last Session Summary (anterior)

Sesión de cierre de tramo Dashboard Maestro MVP en testing demo-only:

- **Persistencia Maestro implementada**: audit events y maintenance mutes ahora se guardan en `data/dashboard-maestro/` como JSON. Sobreviven reinicio del proceso. Arranque defensivo: si JSON corrupto/missing, arranca vacío.
- **UI testing**: banner `Testing · demo only` en cabecera. Agentes disabled por override (`santa-ana`, `asturias`) muestran badge `Off en testing` en vez de solo `No`.
- **`_overrideInfo`** agregado al payload de agentes vía `agent-registry.js` para que frontend distinga disabled por override vs disabled normal.
- **Estado de esa sesión**: PM2 control aún estaba deshabilitado y faltaba validar el dashboard demo. Esto ya fue resuelto en sesiones posteriores con `restart bot` sobre `demo-local`.
- **No se tocó producción ni runtime protegido**.

Pendiente inmediato: SSH a VPS testing para validar nombre PM2 del dashboard humano del demo (puerto 5011).

### Cambios Realizados
- **`config/agents.json`**: Nuevo agente `demo-local` (puertos API 5010, dashboard 5011), sin catálogo, admin solo si se configura
- **`flujos.js`**: `getMensajeBienvenida()` parametrizada con `agentInfo` opcional — si no se pasa usa valores hardcodeados actuales (compatible con Santa Ana/Asturias)
- **`lib/agent-manager.js`**: Pasa `this.config.info` al llamar a `getMensajeBienvenida()`
- **`dashboard-humano-v2/server.js`**: Fix `express.static('public')` → usa `path.join(__dirname, 'public')` (ruta absoluta) para que funcione cuando el dashboard es lanzado como hijo del orquestador

### Deploy en VPS
- `bot_testing` corriendo en PM2 como `bot-demo-local`
- Dashboard accesible en `http://2.24.89.243:5011`
- Número WhatsApp: 11 7145-8944
- Sesión aislada: `.wwebjs_auth_testing/demo-session/`
- Catalog: no tiene (demo de sistema, no de cotillón)

### Para agregar un nuevo agente demo en el futuro
1. Agregar entrada en `config/agents.json`
2. Crear directorio `data/{agent-id}/` y `logs/{agent-id}/` (se crean solos al iniciar)
3. Para que no herede admins del `.env`, crear `data/{agent-id}/admin-numbers.json` con `{"admins":[]}`
4. En VPS: `git pull`, crear PM2, escanear QR

## Dashboard Maestro Current Status

Estado verificado en testing VPS el 2026-05-17:

- `bot_testing` actualizado a `26508f2`.
- PM2 `dashboard-maestro-testing` online.
- Puerto interno: `4050`.
- CWD: `/home/forma/bot_testing/multi-tenant/dashboard-maestro`.
- Dashboard Maestro testing está OK.
- Testing activo real: `demo-local`; Santa Ana producción se muestra aparte como `santa-ana-prod` read-only.
- `santa-ana` y `asturias` están disabled por `enabledOverrides` en `/home/forma/bot_testing/config/agents.override.json`.
- `bot-demo-local` online y WhatsApp connected.
- `bot-dolce-dev` stopped.
- `bot-dolce-prd` online; no tocar.
- Backup-now testing habilitado y probado varias veces.
- PM2 control testing habilitado y probado con `restart bot` sobre `demo-local`; target `bot-demo-local`, auditoría `success`.
- Dashboard demo `5011` no tiene PM2 separado; corre como hijo de `bot-demo-local`.
- Producción intacta. Maestro solo observa Santa Ana producción en read-only.

Pendientes inmediatos:

1. Fase 1 Santa Ana: completar registro final de rutas actuales; backup manual y PM2 ya quedaron validados.
2. Mantener acceso por túnel SSH para MVP. No abrir puerto `4050` ni proxy reverso hasta decidir HTTPS/auth.
3. Antes de escribir en producción: backup productivo, confirmación explícita y ventana controlada.
4. Mejora futura opcional: crear PM2 separado para dashboard demo `5011` si se requiere reiniciarlo sin reiniciar `bot-demo-local`.

Avance local posterior:

- Verificación read-only por SSH confirmó Maestro OK en loopback.
- PM2 testing real usa nombres históricos; Dashboard Maestro mapea `demo-local.bot` a `bot-demo-local` con `processOverrides`.
- `scripts/backup-testing.sh` fue usado para backup-now de `bot_testing` y quedó validado con backups timestamped en `/home/forma/backups-testing/`.
- Backup productivo manual validado: `/home/forma/backups-prod/bot_dolce-pre-maestro-20260517-232344.tar.gz`.
- Runbook Asturias creado: `.gsd/milestones/multi-tenant-architecture/ASTURIAS_ONBOARDING_RUNBOOK.md`.

## Last Session Summary (anterior)

Sesión `/interrógame` sobre la evolución multi-tenant y el Dashboard Maestro.

### Decisiones Tomadas
- Multi-tenant significa multi-cliente: `Cliente -> Agente/Local -> WhatsApp session + data + dashboard humano`.
- El Dashboard Maestro se construye como app nueva en `multi-tenant/dashboard-maestro/`.
- El Dashboard Maestro reemplazará eventualmente a `dashboard-central.js`, pero solo después de pruebas y aprobación.
- Producción actual (`bot_dolce` en VPS) queda estable; no migrar durante el MVP.
- Testing VPS (`bot_testing`) es el laboratorio para Dashboard Maestro.
- Santa Ana producción atiende clientes reales; sus datos runtime son intocables sin backup explícito.
- Asturias puede onboardearse con el sistema multi-agente actual si hace falta esta semana.
- JSON se mantiene por ahora; SQLite queda postergado para una fase posterior.
- Futuro recomendado: SQLite por agente/local y base compartida solo para monitoreo.
- Dashboard Maestro es interno para owner/socio; clientes no acceden al Maestro.
- Cliente/empleado accede por agente/local. Dashboard cliente multi-agente queda diferido.
- Backups diarios en VPS con retención default de 30 días; incluir `.wwebjs_auth/`.
- Restore desde UI queda fuera del MVP; restauración manual por SSH.
- Alertas: dashboard primero, Telegram como primer canal externo, email y WhatsApp después.
- Refresh del Maestro: cada 5 minutos + botón "actualizar ahora".
- Acciones críticas: confirmación simple + auditoría + feedback visible.

### Documentación Actualizada
- `AGENTS.md`: reglas operativas para agentes de código.
- `.gsd/milestones/multi-tenant-architecture/README.md`: índice vigente del milestone.
- `.gsd/milestones/multi-tenant-architecture/CURRENT_DECISIONS.md`: decisiones actuales.
- `.gsd/milestones/multi-tenant-architecture/DASHBOARD_MAESTRO_MVP.md`: alcance MVP.
- `.gsd/milestones/multi-tenant-architecture/PHASE_2_PLAN.md`: plan de implementación.
- Documentos viejos de planificación multi-tenant archivados en `.gsd/milestones/multi-tenant-architecture/archive/2026-05-10-planning/`.

### Próximo Paso
Implementar Dashboard Maestro MVP como app nueva, empezando por skeleton + lectura de agentes + health collection en testing.

## Last Session Summary

Sesión de interrogación GSD (/interrógame). Se entrevistó al usuario sobre el plan de estabilización multi-agente.

### Problemas Detectados
- **`lib/admin-commands.js`**: Singleton global compartido + imports rotos de `control-manual.js`
- **`lib/agent-manager.js:903`**: `notificarDashboard()` función global ignora puerto por agente
- **`dashboard-humano-v2/server.js:245`**: `BOT_API_PORT` hardcodeado a 3011
- **Media handling**: imágenes, videos, docs ignorados en silencio
- **Emojis**: no manejados en flujo de menú

### Decisiones Tomadas
- `admin-commands.js` → factory pattern (`createAdminCommands`)
- `admin-numbers.json` → por agente en `data/{agentId}/`
- `notificarDashboard()` → método de instancia en AgentManager
- Dashboard se levanta automáticamente por agente vía orchestrator
- Pipeline: Local → Testing (VPS) → Producción (VPS)

### Lo Completado
1. **Fase 1.1** ✅ `admin-commands.js` → factory pattern (fix imports rotos)
2. **Fase 1.2** ✅ `admin-numbers.json` → por agente en `data/{agentId}/`
3. **Fase 1.3** ✅ `notificarDashboard()` → método de instancia
4. **Fase 1.4** ✅ `BOT_API_PORT` → dinámico desde agents.json
5. **Fase 2.1** ✅ Orchestrator auto-levanta dashboard por agente
6. **Fase 3.1** ✅ Respuestas explícitas para imágenes, video, documento, sticker, location
7. **Fase 3.2** ✅ Manejo de emojis en estados de menú
8. **Fase 4.1-4.3** ✅ Asturias habilitado, admin numbers configurados

### Commits (9 total)
- `9aed38d` factory pattern admin-commands
- `d443156` admin-numbers per-agent
- `09ada5e` notificarDashboard instance method
- `ac9c8d5` BOT_API_PORT dinámico
- `0140953` orchestrator auto-dashboard
- `35ef746` media handling explícito
- `3a2bf3a` emoji handling en menú
- `bd76763` onboarding Asturias
- Various docs updates

### Próximo Paso
Fase 5: Testing pipeline (Local → Testing VPS → Producción VPS)
- **`lib/agent-manager.js`**: Extract `_createClient()`, add retry logic on Chrome orphan conflict, add `_setupSignalHandlers()` with SIGTERM/SIGINT graceful shutdown, add `killOrphanChrome()` helper
- **`dashboard-humano-v2/server.js`**: `localhost` → `127.0.0.1` (IPv4 explícito) en llamadas HTTP internas al bot API
- **`routes/human-panel.js`**: `localhost` → `127.0.0.1` (IPv4 explícito) en llamadas HTTP internas

### Sesión anterior
Dashboard Humano v2 — UX/UI improvements sprint.
- **`config.js`**: Toast notification system, custom confirm dialog, inline name editing, optimistic UI updates con rollback, spinners de carga, feedback inline en modal (sin alert/confirm)
- **`config.css`**: Toast, confirm-dialog, inline-edit, spinner, form-feedback, btn-danger, stat cards, responsive tabs
- **`main.css`**: Hamburger menu toggle, sidebar absolute overlay con backdrop (mobile), breakpoints 767/768/1024, header text ellipsis en mobile
- **`chat-list.css`**: `min-width: 0` para sidebar, dispatchEvent `chatSelected` para auto-close sidebar en mobile
- **`conversation.css`**: Min 44px touch targets, responsive message width (85% mobile), input/buttons full-width en mobile
- **`app.js`**: Stats tab handler, sidebar toggle/close functions, auto-close sidebar on chat select, responsive tab switching
- **`stats.js`** (nuevo): LoadStats con cómputo de conversaciones hoy, esperando humano, bot activo, tiempo de respuesta promedio (sample 8 chats)
- **`index.html`**: Hamburger button, stats tab + containers, sidebar backdrop, stats.js script tag
- **`scripts/backup.sh`**: Backup diario por agente (historial, pausas, stats, config), comprime en .tar.gz, limpia backups >30 días
- **`scripts/rotate-logs.sh`**: Rota bot.log y security.log si superan 10MB, mantiene 5 versiones
- **`scripts/setup-cron.sh`**: Instala cron jobs (backup 3AM, rotate 2AM) sin duplicar

### Sesión anterior
Dashboard Central mejorado con indicadores en tiempo real.
- **`dashboard-central.js`**: `pausedCount` agregado a payloads WebSocket (initial + update)
- **`public-central/app.js`**: `updateAgentCard` actualiza pending-alert y botón Panel Humano en vivo; barra de estado del sistema con bots online y pendientes
- **`public-central/index.html`**: Barra `.system-status` debajo del header
- **`public-central/style.css`**: `.btn-danger` con animación pulse, `.system-status` barra oscura

### Sesión anterior
Scripts bash para deploy en VPS Ubuntu.
- **`scripts/sync-testing.sh`**: Resetea `bot_testing` al `origin/main`, preserva data/logs/auth y archivos runtime (admin-numbers, phone-map), reinstala deps, reinicia servicios PM2
- **`scripts/deploy-production.sh`**: `git pull` en `bot_dolce`, instala deps (root + dashboard-humano-v2), reinicia servicios PM2 de producción

### Sesión anterior
Script interactivo `add-client.js` para onboarding de nuevos clientes en < 5 minutos.
- **`scripts/add-client.js`**: Pregunta nombre/dirección/teléfono/horario/usuario/contraseña, asigna puertos sin conflicto, genera hash bcrypt, crea directorios + archivos de datos, agrega a agents.json (disabled por defecto)
- **`package.json`**: Script `npm run add-client`, dependencia `bcrypt` agregada
- **`README.md`**: Sección "Agregar Nuevo Cliente" simplificada apuntando a `npm run add-client`

### Sesión anterior
Modernización del Dashboard Central (puerto 3000/4000).
- **`dashboard-central.js`**: HTTP Basic Auth (configurable via .env), permite estáticos y socket.io sin auth
- **`public-central/app.js`**: "Panel Humano" abre el dashboard-humano-v2 en el puerto correcto del agente; card deshabilitados muestra info + aviso; card activos muestra alerta roja si hay chats esperando
- **`public-central/style.css`**: `.pending-alert` (rojo) y `.agent-note` (amarillo) agregados
- **`.env.example`**: Variables `DASHBOARD_CENTRAL_USER` y `DASHBOARD_CENTRAL_PASS`

### Sesión anterior
Fix botones 🔄 y ❌ en Config + búsqueda de chats.
- **`config.js`**: `onclick` inline reemplazado por `data-action` + event delegation; logs de debug en `toggleRole`/`deleteNumber`
- **`chat-list.js`**: Input `#searchInput` ahora filtra chats por nombre/preview en tiempo real

### Sesión anterior
Fix notificaciones sonoras: Web Audio API reemplazada por archivo WAV real.
- **`scripts/generate-notification-sound.js`**: Script que genera un sine wave beep (800Hz, 0.25s) como WAV
- **`public/assets/sounds/notification.wav`**: Archivo de sonido generado (21.5KB)
- **`index.html`**: Referencia actualizada de `.mp3` a `.wav`
- **`notifications.js`**: Simplificado — usa `<audio>` element en vez de AudioContext; "unlock" en primer click

### Sesión anterior
Agente "asturias" agregado al sistema multi-tenant.
- **`config/agents.json`**: `local-2` (disabled) reemplazado por `asturias` (enabled, puerto API 3012, dashboard 3002)
- **`data/asturias/`**: Directorio con `historial.json`, `pausas.json`, `.gitkeep`
- **`logs/asturias/`**: Directorio con `.gitkeep`
- **`scripts/start-dashboard-asturias.sh`**: Script de inicio producción (pm2)
- **`scripts/start-dashboard-asturias-testing.sh`**: Script de inicio testing (puerto 4003)
- **`dashboard-humano-v2/server.js`**: `CONFIG_AGENT_ID` ahora lee de env var `process.env.CONFIG_AGENT_ID || AGENT_ID`

### Sesiones anteriores
- WhatsApp @lid → mapeo automático a número de teléfono
- Notificaciones en tiempo real + sonido para dashboard-humano-v2

## Project Status

**Phase:** Producción (Dashboard Humano v2)
**Architecture:** Cliente-Servidor (Express + Socket.IO)
**Deployment:** VPS (srv1658334.hstgr.cloud) con PM2

## Key Metrics

- **Dashboards:** 2 (Dashboard Humano :3001, Dashboard Central :3000)
- **Frontend:** HTML + CSS + Vanilla JS (sin frameworks)
- **Backend:** Express + Socket.IO + JWT
- **Auth:** Cookies httpOnly + bcrypt + rate limiting
- **Bot Deployments:** 2 (PRD + DEV en VPS)

## Recent Changes

- ✅ Testing environment diferenciado visualmente (header negro + banner naranja + [TEST])
- ✅ AGENT_ID y DATA_PATH configurables por env var
- ✅ Fix envío de mensajes (escritura directa a historial.json, sin depender de bot API)
- ✅ WebSocket tiempo real (bot notifica dashboard via HTTP local)
- ✅ Dashboard fixes (conversation.js debug, config.js bug, server.js preview)
- ✅ Dashboard Admin Management deployado (CRUD números admin)
- ✅ Multi-tenant Phase 1 completado (estructura + templates)
- ✅ Dashboard Humano v2 con login y autenticación
- ✅ Dual environment (PRD + DEV) configurado en VPS
- ✅ Sistema de números ignorados para admins
- ✅ Notificaciones sonoras vía Web Audio API (sin archivo .mp3)
- ✅ AudioContext inicializado en primer gesto del usuario (fix autoplay)
- ✅ Mapa automático @lid → teléfono para resolución de admin-numbers
- ✅ Agente asturias agregado al sistema multi-tenant
- ✅ Notificación sonora con WAV real en vez de Web Audio API
- ✅ Fix botones Config con event delegation + búsqueda de chats
- ✅ Dashboard Central con auth básica + cards mejoradas + link a dashboard-humano
- ✅ Script interactivo add-client.js para onboarding de nuevos clientes
- ✅ Scripts bash sync-testing.sh y deploy-production.sh para VPS
- ✅ Dashboard Central con indicador de chats pendientes en tiempo real + barra de estado
- ✅ Scripts backup.sh, rotate-logs.sh, setup-cron.sh para VPS
- ✅ Config.js UX overhaul: toast, confirm dialog, inline edit, optimistic UI, loading states
- ✅ Responsive dashboard: sidebar overlay on mobile, hamburger menu, 44px touch targets
- ✅ Stats tab: daily conversation metrics, avg response time
- ✅ Bug fix: IPv4 explícito (127.0.0.1) en llamadas HTTP internas para evitar ECONNREFUSED ::1
- ✅ Bug fix: Graceful shutdown (SIGTERM/SIGINT) + retry automático en Chrome huérfano

## Next Steps

1. **Multi-Tenant Fase 2** — Dashboard Maestro MVP como app nueva en `multi-tenant/dashboard-maestro/`

## Known Issues

- Sin tests automatizados
- Cache de navegador requiere versioning en assets CSS (`?v=N`)
- Stats: tiempo promedio calculado solo sobre últimos 8 chats (puede no ser representativo con muchos chats)

## Documentation Files

- `.gsd/STATE.md` — Project state (this file)
- `.gsd/ARCHITECTURE.md` — System design and component documentation
- `.gsd/STACK.md` — Technology inventory and dependencies
- `.gsd/memory/journal/` — Session journals
- `.gsd/milestones/` — Milestone documentation
- `.gsd/state/IMPLEMENTATION_PLAN.md` — Dynamic task tracker
