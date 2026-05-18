# IMPLEMENTATION_PLAN.md

> **Dynamic Task Tracker for Ralph Loop Autonomous Execution**

---

## Current Status

**Project**: exp010-whatsappbot
**Phase**: Multi-Tenant Fase 2 - Dashboard Maestro MVP + Preparación Integración Santa Ana
**Last Updated**: 2026-05-17

> **Objetivo activo**: Dashboard Maestro MVP sigue siendo la Fase 2 vigente. Se suma preparación para integrar Santa Ana producción al modelo multi-tenant (read-only primero).
>
> **Demo comercial neutral (2026-05-17)**: implementación desplegada y probada en `bot_testing` para `demo-local`. Tiene flujo propio, mensaje informativo inicial y una sola ronda corta; no entra al flujo Dolce Party. `bot-demo-local` reiniciado, `/status` responde `connected` y prueba WhatsApp manual OK.
>
> **Fase 0 testing avance crítico (2026-05-17)**: PM2 control habilitado solo en `dashboard-maestro-testing`; `demo-local.bot` mapeado a `bot-demo-local`; dashboard demo no tiene PM2 separado, corre como hijo de `bot-demo-local`, por eso no se configuró target `dashboard`. Backup-now testing ya tiene 3 ejecuciones exitosas. Auditoría y mutes persistentes validados tras reinicio de Maestro.
>
> **Fase 0 testing cerrada (2026-05-17)**: PM2 control real probado desde Maestro con `restart bot` sobre `demo-local`; target PM2 `bot-demo-local`, auditoría `success`. Post-check OK: `bot-demo-local` online, `/status` `isRunning=true`, WhatsApp `connected`, dashboard demo `5011` HTTP `200`. Excepción documentada: no existe PM2 separado para reiniciar solo el dashboard demo.
>
> **Baseline Santa Ana producción (2026-05-17)**: verificación read-only completada. `dashboard-humano-santa-ana` online en puerto `3001`, `bot-dolce-prd` online, `3011/status` responde `santa-ana isRunning=true`. Nuevo documento: `.gsd/milestones/multi-tenant-architecture/SANTA_ANA_PRODUCTION_BASELINE.md`.
>
> **Santa Ana read-only en Maestro (2026-05-17)**: `dashboard-maestro-testing` lista `santa-ana-prod` como `dolce-party / production / readOnly`. Health OK contra `3011` y `3001`. Acciones PM2 bloqueadas por `readOnly` y rechazo auditado. Producción intacta.
>
> **Santa Ana read-only mejora (2026-05-17)**: Maestro soporta `paths.stats` y `paths.pauses` absolutos. `santa-ana-prod` lee métricas desde `/home/forma/bot_dolce/data/estadisticas.json` y handoffs desde `/home/forma/bot_dolce/data/pausas.json`; ya no muestra archivos faltantes. WhatsApp muestra `running` cuando producción expone `isRunning=true` pero no `whatsapp.status`.
>
> **Fase 1 Santa Ana avance seguro (2026-05-17)**: backup manual productivo creado en `/home/forma/backups-prod/bot_dolce-pre-maestro-20260517-232344.tar.gz` y validado con `tar tzf`. Tamaño final `406900359 bytes`. No se reiniciaron ni modificaron procesos productivos; `bot-dolce-prd` y `dashboard-humano-santa-ana` siguieron online.
>
> **Asturias pendiente QR (2026-05-17)**: número real confirmado `5493513114575`. Por ahora queda pendiente sin escanear QR, sin levantar PM2 nuevo y sin activar operación comercial. Usará datos base compartidos con Santa Ana y catálogo `catalogs/catalogo-santa-ana.js` hasta nueva decisión.
>
> **Fase 1 Santa Ana rutas finales (2026-05-18)**: rutas productivas registradas por SSH read-only: repo `/home/forma/bot_dolce`, auth `/home/forma/bot_dolce/.wwebjs_auth/session-santa-ana-session`, data/logs/catalog/dashboard y PM2 exactos. Asturias quedó preconfigurado en `config/agents.json` con teléfono `5493513114575` y dirección base acordada; QR/PM2 siguen pendientes.
>
> **Maestro pending QR (2026-05-18)**: Dashboard Maestro soporta `statusOverrides` para mostrar agentes en preparación. `asturias` debe quedar como `pending-qr` en testing hasta escanear QR; no genera health real ni alertas.
>
> **Última sesión documentación (2026-05-17)**: Se documentó el modelo tenant (`TENANT_MODEL.md`), se creó checklist migración Santa Ana (`SANTA_ANA_MIGRATION_CHECKLIST.md`), y se diseñó config futura de ejemplo (`multi-tenant/clients/dolce-party.example.json`). Sin cambios de código, runtime ni producción.
>
> **Sesión anterior (2026-05-17)**: Persistencia JSON (audit events + mutes) implementada en `data/dashboard-maestro/`. UI testing con banner `Testing · demo only` y badges `Off en testing`. `_overrideInfo` agregado en payload de agentes.
>
> **Estado Dashboard Maestro testing (2026-05-17)**: `bot_testing` actualizado a `26508f2`; PM2 `dashboard-maestro-testing` corre online en puerto interno 4050; testing activo real en Maestro es `demo-local` y Santa Ana producción aparece read-only como `santa-ana-prod`; `santa-ana` y `asturias` disabled por `enabledOverrides`; backup-now y PM2 control demo probados; producción intacta.

---

## 🚨 Milestone Activo: Dashboard Maestro MVP

**Objetivo**: Crear un Dashboard Maestro interno para monitorear y controlar agentes/clientes sin tocar producción actual.

**Estrategia**:
- Nueva app en `multi-tenant/dashboard-maestro/`.
- Probar primero en entorno testing VPS.
- Mantener `bot_dolce` producción estable hasta aprobación explícita.
- No migrar a SQLite durante este MVP.

**Documentos vigentes**:
- `.gsd/milestones/multi-tenant-architecture/README.md`
- `.gsd/milestones/multi-tenant-architecture/CURRENT_DECISIONS.md`
- `.gsd/milestones/multi-tenant-architecture/DASHBOARD_MAESTRO_MVP.md`
- `.gsd/milestones/multi-tenant-architecture/PHASE_2_PLAN.md`
- `AGENTS.md`

### Tareas Actuales

- [x] **2.1 App Skeleton**
  - Crear `multi-tenant/dashboard-maestro/` como app Express + Socket.IO independiente
  - Puerto configurable
  - Acceso interno autenticado
  - No reemplazar `dashboard-central.js`
  - Progreso 2026-05-17: skeleton local creado con Express + Socket.IO, puerto `DASHBOARD_MAESTRO_PORT`, UI estática, endpoint `/health` y README.
  - Progreso 2026-05-17: HTTP Basic Auth agregado con `DASHBOARD_MAESTRO_USER` / `DASHBOARD_MAESTRO_PASS`; `/health` queda libre para monitoreo.

- [x] **2.2 Agent Registry Adapter**
  - Leer agentes existentes sin mutar configuración
  - Mostrar cliente/agente, puertos API/dashboard y enabled/disabled
  - Preparar compatibilidad futura con `/clients/...`
  - Progreso 2026-05-17: adapter read-only creado para `config/agents.json`; UI lista id, nombre, enabled, puertos y paths.
  - Progreso 2026-05-17: adapter preparado para sumar futuros `multi-tenant/clients/*/agents.json` read-only, con `clientId` y metadatos de fuente.
  - Progreso 2026-05-17: adapter aplica `config/agents.override.json` read-only para que testing use puertos 4011/4001 y 4012/4003.
  - Progreso 2026-05-17: adapter soporta `enabledOverrides` para apagar agentes no activos en testing sin mutar `config/agents.json`.

- [x] **2.3 Health Collection**
  - Detectar API bot up/down
  - Detectar dashboard humano up/down
  - Registrar último check exitoso y errores
  - Progreso 2026-05-17: collector HTTP read-only agregado para bot API `/status` y dashboard humano `/`; el payload muestra estado, errores, timestamp de check y semáforo general.
  - Progreso 2026-05-17: el collector conserva en memoria `lastSuccessfulCheck` y `lastError` por URL durante la vida del proceso.
  - Progreso 2026-05-17: UI muestra estado, error/latencia y último check exitoso por bot API y dashboard humano.
  - Progreso 2026-05-17: para dashboards humanos, cualquier respuesta HTTP cuenta como proceso alcanzable para evitar falso down/degraded por 404 en `/`.
  - Progreso 2026-05-17: validado en VPS testing por loopback contra `santa-ana` y `asturias`; overall `ok`, ambos bots `up`, ambos dashboards `up`.

- [ ] **2.4 PM2 Control Layer**
  - Normalizar nombres PM2 en testing
  - Start/stop/restart por capa segura
  - Auditar acciones y mostrar feedback visible
  - Progreso 2026-05-17: capa server-side agregada con allowlist de acciones/targets, nombres PM2 normalizados, auditoría en memoria y UI; acciones reales quedan deshabilitadas por default con `DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL`.
  - Progreso 2026-05-17: verificación read-only PM2 en VPS identificó nombres reales testing (`bot-dolce-dev`, `dashboard-humano-testing`, `dashboard-humano-asturias`, `bot-demo-local`). Dashboard Maestro ahora soporta `processOverrides` en `config/agents.override.json` para mapear esos nombres sin tocar `config/agents.json`.
  - Progreso 2026-05-17: `processOverrides.demo-local` documentado con solo `bot: bot-demo-local` en HANDOFF.md.
  - Progreso 2026-05-17: validado por SSH que `dashboard-dev` no es dashboard humano demo; ejecuta `dashboard-central.js`.
  - Progreso 2026-05-17: puerto `5011` servido por `dashboard-humano-v2/server.js` como proceso hijo de `bot-demo-local`, no PM2 separado.
  - Progreso 2026-05-17: `/home/forma/bot_testing/config/agents.override.json` actualizado con `processOverrides.demo-local.bot = bot-demo-local`.
  - Progreso 2026-05-17: `DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL=true` y `DASHBOARD_MAESTRO_PM2_ENV=testing` habilitados solo en `dashboard-maestro-testing`.
  - Progreso 2026-05-17: prueba segura `restart dashboard` contra `demo-local` auditada como error esperado porque no existe `dashboard-humano-demo-local-testing`; no afectó procesos reales.
  - Progreso 2026-05-17: prueba real PM2 desde Maestro completada con `restart bot` contra `demo-local`; target `bot-demo-local`, resultado `success`, auditoría persistente.
  - Progreso 2026-05-17: post-check PM2 OK: `bot-demo-local` online, `/status` `isRunning=true`, WhatsApp `connected`, dashboard demo `5011` HTTP `200`.
  - Excepción: si se requiere reiniciar solo el dashboard demo desde Maestro, crear/validar un PM2 separado para `5011` o agregar una capa explícita para controlar el proceso hijo.

- [ ] **2.5 Backup Now**
  - Crear backup timestamped en testing
  - Incluir runtime data y `.wwebjs_auth/`
  - No implementar restore desde UI
  - Progreso 2026-05-17: endpoint/UI backup-now agregados con auditoría; ejecución real deshabilitada por default y requiere `DASHBOARD_MAESTRO_BACKUP_SCRIPT` explícito para testing.
  - Pendiente: crear script de backup específico para testing antes de habilitar backup-now. No usar `scripts/backup.sh` actual tal cual porque está hardcodeado a `/home/forma/bot_dolce`.
  - Progreso 2026-05-17: creado `scripts/backup-testing.sh` para `bot_testing`, con guardrail que rechaza rutas que contengan `/bot_dolce`; queda sin habilitar hasta autorización explícita.
  - Progreso 2026-05-17: backup-now habilitado y validado en `bot_testing`; creó `/home/forma/backups-testing/bot_testing-20260517-183114.tar.gz` incluyendo `data/`, `logs/`, `config/agents.json`, `config/agents.override.json` y `.wwebjs_auth/`; auditoría registró `success`.
  - Progreso 2026-05-17: backup-now testing repetido exitosamente: `/home/forma/backups-testing/bot_testing-20260517-212752.tar.gz` y `/home/forma/backups-testing/bot_testing-20260517-212810.tar.gz`. Total validado: 3 backups exitosos.

- [x] **2.6 Alerts MVP**
  - Alertas visibles en dashboard
  - Bot down, dashboard down, WhatsApp disconnected si disponible
  - Handoff > 10 minutos
  - Mute por mantenimiento por agente
  - Progreso 2026-05-17: alertas visibles derivadas de health para `bot-down` y `dashboard-down`. Pendiente WhatsApp disconnected, handoff >10 minutos y mute.
  - Progreso 2026-05-17: handoffs pendientes leídos read-only desde `pausas.json`; alerta crítica si esperan más de 10 minutos.
  - Progreso 2026-05-17: soporte de `whatsapp-disconnected` cuando `/status` expone estado y mute de mantenimiento por agente en memoria.
  - Progreso 2026-05-17: `AgentManager` expone `whatsapp.status` en `/status` desde eventos de `whatsapp-web.js`; Maestro lo parsea para dejar de mostrar `unknown` cuando el bot conoce el estado.

- [x] **2.7 Metrics & Cost Visibility**
  - Mensajes recibidos/enviados
  - Bot vs humano
  - Handoffs
  - IA calls y costo estimado si hay datos
  - Progreso 2026-05-17: métricas read-only desde `estadisticas.json` para mensajes recibidos/enviados y handoffs; IA/costo queda explícitamente `Sin datos` hasta instrumentación.

- [ ] **2.8 Testing Checklist**
  - Maestro ve agentes testing
  - PM2 actions funcionan en testing
  - Backup now funciona
  - Alertas renderizan
  - Auditoría registra acciones
  - Producción Santa Ana no fue tocada
  - Progreso 2026-05-17: checklist local/testing creado en `multi-tenant/dashboard-maestro/TESTING_CHECKLIST.md`; validación real de PM2/backup queda pendiente para VPS testing autorizado.
  - Progreso 2026-05-17: smoke interno VPS por loopback completado: `/health` OK, `/api/agents` OK con auth, overrides testing aplicados, estado general OK.
  - Pendiente: probar UI completa vía túnel SSH o exponer externamente el puerto 4050; probar PM2 real y backup-now real solo después de autorización/preparación de testing.
  - Progreso 2026-05-17: controles confirmados deshabilitados en VPS (`DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL=false`, `DASHBOARD_MAESTRO_ENABLE_BACKUP_NOW=false`); backup script no configurado en PM2 actual.
  - Progreso 2026-05-17: Dashboard Maestro testing OK en estado demo-only: `demo-local` activo real, `santa-ana` y `asturias` disabled por `enabledOverrides`, backup-now probado, PM2 control deshabilitado, producción intacta.
  - ✅ Persistencia implementada: audit events en `data/dashboard-maestro/audit-events.json` y mutes en `data/dashboard-maestro/maintenance-mutes.json`. Carga en init, guarda en cada mutación. Defensivo: si JSON corrupto/missing, arranca vacío.
  - ✅ UI testing: banner `Testing · demo only` en cabecera. Badge `Off en testing` para agentes disabled por override. `_overrideInfo` en payload para que frontend distinga override vs disabled normal.
  - ✅ Persistencia validada en VPS: mute de prueba `demo-local` sobrevivió reinicio de `dashboard-maestro-testing`; luego fue removido y `maintenance-mutes.json` quedó `[]`. Audit events sobrevivieron reinicio.
  - ✅ PM2 control testing validado con acción real de bajo riesgo: `restart bot` sobre `demo-local` vía Maestro. Producción siguió read-only e intacta.
  - ✅ `TESTING_CHECKLIST.md` actualizado con la excepción del dashboard demo sin PM2 separado.

### Fuera de Alcance del MVP

- Migración SQLite
- Dashboard cliente multi-agente
- Onboarding completo por formulario web
- Restore desde UI
- Reemplazar producción
- Responsive mobile-first

---

## 📋 Milestone: Preparación Integración Santa Ana

**Objetivo**: Preparar el camino para integrar Santa Ana producción al modelo multi-tenant sin migrar datos ni interrumpir servicio. Primero read-only, luego control gradual.

**Documentos creados**:
- `.gsd/milestones/multi-tenant-architecture/TENANT_MODEL.md` — modelo `cliente -> agente`
- `.gsd/milestones/multi-tenant-architecture/SANTA_ANA_MIGRATION_CHECKLIST.md` — checklist en 5 fases
- `.gsd/milestones/multi-tenant-architecture/SANTA_ANA_PRODUCTION_BASELINE.md` — baseline read-only producción Santa Ana
- `.gsd/milestones/multi-tenant-architecture/ASTURIAS_ONBOARDING_RUNBOOK.md` — runbook operativo para alta Asturias cuando esté disponible el QR
- `multi-tenant/clients/README.md` — estructura futura explicada
- `multi-tenant/clients/dolce-party.example.json` — ejemplo conceptual (no activo)

**No se creó config activa que el Maestro pueda leer.** El ejemplo es `.example.json`.

### Fases del Checklist

- [x] **Fase 0 — Precondiciones testing**: demo-local estable, backup-now probado, PM2 control probado, auditoría persistente, UI clara
- [ ] **Fase 1 — Preparación producción**: backup manual `bot_dolce`, registrar PM2 y rutas, no modificar procesos
  - Progreso 2026-05-17: baseline read-only registrada. PM2 reales: `bot-dolce-prd`, `dashboard-humano-santa-ana`. HTTP `3001/index.html` y `3011/status` OK.
  - Progreso 2026-05-17: backup manual productivo creado y validado: `/home/forma/backups-prod/bot_dolce-pre-maestro-20260517-232344.tar.gz` (`406900359 bytes`, `TAR_OK`).
  - Progreso 2026-05-17: post-backup producción OK: `3011/status` `isRunning=true`, `3001/index.html` HTTP `200`, PM2 productivo online.
  - Progreso 2026-05-18: rutas productivas finales registradas: `.wwebjs_auth/session-santa-ana-session`, `data/santa-ana`, `logs/santa-ana`, `catalogs/catalogo-santa-ana.js`, `dashboard-humano-v2`, PM2 scripts/CWD.
- [ ] **Fase 2 — Alta Maestro read-only**: health checks y métricas Santa Ana desde Maestro, sin botones destructivos
  - Progreso 2026-05-17: Maestro testing lista `santa-ana-prod` como additionalAgent read-only desde `config/agents.override.json`.
  - Progreso 2026-05-17: health checks `3011/status` y dashboard `3001` OK; overall `ok`.
  - Progreso 2026-05-17: acciones PM2 bloqueadas por `readOnly`; prueba `restart dashboard` rechazada y auditada sin tocar procesos.
  - Progreso 2026-05-17: métricas y handoffs read-only leen archivos absolutos configurados en `paths.stats` y `paths.pauses`.
- [ ] **Fase 3 — Backup desde Maestro**: habilitar backup-now solo producción, probar una vez
- [ ] **Fase 4 — Control PM2 producción**: solo si testing probado, empezar por restart dashboard

### Reglas

- Santa Ana no se migra moviendo archivos. Se integra por referencia a sus rutas actuales.
- No tocar `bot_dolce` runtime data.
- PM2 control producción sigue bloqueado hasta decisión explícita, backup productivo y ventana controlada.
- Nuevos clientes se gestionarán por script/config primero, luego por Maestro.

---

## 📋 Milestone: Demo Comercial Neutral

**Objetivo**: Preparar `demo-local` para mostrar el sistema a prospectos sin usar flujo ni datos de Dolce Party.

**Problema**: El demo actual puede arrastrar comportamiento de Dolce Party. Eso confunde durante una demostración comercial y puede dar la impresión de que el prospecto está hablando con una tienda real.

### Alcance

- [x] Crear flujo específico para `demo-local`.
- [x] Mensaje inicial informativo: explicar que es una demo del sistema.
- [x] Limitar la interacción a una ronda o recorrido corto.
- [x] Quitar dependencia de catálogo, dirección, horarios, tono y datos de Dolce Party.
- [ ] Revisar que `demo-local` no herede números cancelados/ignorados/admin que no correspondan.
- [x] Mantener datos demo solo en `data/demo-local/` o config demo específica.
- [x] Deploy a `bot_testing` VPS: `flujos.js`, `lib/agent-manager.js` y `config/agents.json`; reinicio de `bot-demo-local`.
- [x] Verificación técnica VPS: `node --check` OK, PM2 online, `/status` puerto `5010` conectado.
- [x] Prueba real con WhatsApp demo `11 7145-8944`: inicio demo, respuesta de muestra, cierre finalizado.

### Fuera de alcance

- No tocar `data/santa-ana/`, `data/asturias/` ni producción.
- No conectar el demo al flujo real de ventas de Dolce Party.
- No hacer onboarding completo de cliente desde el demo.

### Criterios de aceptación

- Un usuario entiende desde el primer mensaje que está en una demo.
- El bot responde una interacción corta y luego cierra o deriva con mensaje claro.
- No menciona datos reales de Dolce Party salvo que se elijan explícitamente como ejemplo ficticio.
- El demo puede mostrarse comercialmente sin explicar aclaraciones manuales.

---

## Milestone Anterior: Estabilización Multi-Agente

---

## 🚨 Milestone Activo: Estabilización Multi-Agente

**Objetivo**: Garantizar que el sistema soporte 2 agentes (Santa Ana + Asturias) en paralelo sin errores.
**Pipeline**: Local → Testing (VPS) → Producción (VPS)
**Deadline**: Semana siguiente (onboarding Asturias)

### Problemas Detectados (Sesión /interrógame 2026-05-14)

| # | Problema | Archivo | Severidad |
|---|----------|---------|-----------|
| 1 | `admin-commands.js` importa funciones que no existen de `control-manual.js` | `lib/admin-commands.js:7-14` | 🔴 ALTO (comandos admin rotos) |
| 2 | `adminNumbers` singleton global compartido entre agentes | `lib/admin-commands.js` | 🔴 ALTO |
| 3 | `notificarDashboard()` usa env var global, ignora puerto por agente | `lib/agent-manager.js:903` | 🔴 ALTO |
| 4 | Dashboard server no se levanta automáticamente por agente | `orchestrator.js` | 🔴 ALTO |
| 5 | Media (imágenes, videos, docs, stickers) ignorados en silencio | `lib/agent-manager.js:244` | 🟡 MEDIO |
| 6 | Emojis en menú no manejados (usuario escribe 😊, bot no entiende) | `lib/agent-manager.js` | 🟡 MEDIO |
| 7 | `agents.json` inconsistencia: `enabled: false` en Asturias | `config/agents.json` | 🟢 BAJO |
| 8 | Catálogo Asturias apunta al mismo archivo que Santa Ana | `config/agents.json` | 🟢 BAJO (aceptado) |

---

## 📋 Plan de Estabilización

```
Fase 1: Foundation (cambios estructurales)
├── 1.1 Refactor admin-commands.js → factory pattern
├── 1.2 Mover admin-numbers.json a data/{agentId}/
├── 1.3 Convertir notificarDashboard() en método de instancia
└── 1.4 Arreglar BOT_API_PORT por agente en dashboard server

Fase 2: Multi-Agent Runtime
├── 2.1 Orchestrator: auto-levantar dashboard por agente
├── 2.2 Verificar aislamiento de sesiones WhatsApp (LocalAuth)
├── 2.3 Dashboard server: leer CONFIG_AGENT_ID de agents.json
└── 2.4 Probar 2 agentes en paralelo localmente

Fase 3: UX & Media
├── 3.1 Respuesta explícita por tipo de media no soportada
├── 3.2 Manejo de emojis en flujo de menú
└── 3.3 Validación de body vacío antes de procesar

Fase 4: Onboarding Asturias
├── 4.1 Habilitar asturias en agents.json
├── 4.2 Crear data/asturias/ con archivos iniciales
├── 4.3 Configurar números admin de Asturias
└── 4.4 Escanear QR de Asturias (sesión WhatsApp)

Fase 5: Testing (Local → Testing → Producción)
├── 5.1 Probar ambos agentes localmente
├── 5.2 Deploy a entorno testing en VPS
├── 5.3 Probar funcionalidad completa en testing
└── 5.4 Deploy a producción
```

---

## Current Tasks

### 🔴 Fase 1: Foundation (Prioridad Alta)

- [x] **1.1 Refactor admin-commands.js → factory pattern** ✅ 2026-05-14
  - Convertido singleton a `createAdminCommands(agentConfig, controlManager)`
  - Fix: imports rotos reemplazados por métodos del controlManager recibido
  - Cada AgentManager crea su propia instancia con sus propios admins
  - Commits: `9aed38d`

- [x] **1.2 Mover admin-numbers.json a data/{agentId}/** ✅ 2026-05-14
  - Migrado `config/admin-numbers.json` → `data/santa-ana/admin-numbers.json` y `data/asturias/admin-numbers.json`
  - Dashboard humano: CRUD ahora apunta a `DATA_PATH/admin-numbers.json`
  - Fallback chain: per-agent file → .env → agents.json
  - Commits: `d443156`

- [x] **1.3 Convertir notificarDashboard() en método de instancia** ✅ 2026-05-14
  - Movida función global a método `AgentManager.notificarDashboard(chatId)`
  - Usa `this.config.ports.dashboard` en vez de env var global
  - Commits: `09ada5e`

- [x] **1.4 BOT_API_PORT dinámico por agente** ✅ 2026-05-14
  - `dashboard-humano-v2/server.js`: agregado `getBotApiPort()` que lee desde agents.json
  - Reemplazados hardcodes de 3011 en ambos endpoints (message/finish)
  - Commits: `ac9c8d5`

### 🟡 Fase 2: Multi-Agent Runtime (Prioridad Alta)

- [x] **2.1 Orchestrator auto-levanta dashboard por agente** ✅ 2026-05-14
  - Spawn proceso dashboard-humano-v2 con env vars correctas por agente
  - Graceful shutdown: mata dashboard al detener agente
  - Comando `list` muestra estado de dashboard
  - Commits: `0140953`

- [x] **2.2 Verificar aislamiento de sesiones WhatsApp** (movido a Fase 5.1 — testing local)

### 🟡 Fase 3: UX & Media (Prioridad Media)

- [x] **3.1 Respuesta explícita por tipo de media** ✅ 2026-05-14
  - image → "No puedo procesar imágenes..."
  - video → "No recibo videos..."
  - document → "No recibo documentos..."
  - sticker → ignorar silenciosamente
  - location → "No procesamos ubicaciones (da la dirección)"
  - body vacío → ignorar sin procesar (no gasta tokens)
  - Commits: `35ef746`

- [x] **3.2 Manejo de emojis en menú** ✅ 2026-05-14
  - Detecta mensajes sin caracteres alfanuméricos en estados de menú
  - Responde: "Por favor, elegí una opción del menú usando el número correspondiente"
  - No interfiere con estado PEDIDO (allí sí se permite texto libre)
  - Commits: `3a2bf3a`

### 🟢 Fase 4: Onboarding Asturias (Prioridad Alta)

- [x] **4.1 Habilitar asturias en agents.json** (`enabled: true`) ✅ 2026-05-14
- [x] **4.2 Crear data/asturias/** con historial.json, pausas.json, admin-numbers.json ✅ 2026-05-14
- [x] **4.3 Configurar números admin de Asturias** (mismos que Santa Ana por defecto) ✅ 2026-05-14
- [ ] **4.4 Escanear QR de Asturias** (sesión WhatsApp) — pendiente para testing
  - Pendiente 2026-05-17: número real confirmado `5493513114575`; no escanear QR ni levantar operación hasta la semana de alta.
  - Pendiente 2026-05-17: seguir `.gsd/milestones/multi-tenant-architecture/ASTURIAS_ONBOARDING_RUNBOOK.md` para testing, producción y rollback.
  - Progreso 2026-05-18: `config/agents.json` preconfigurado con teléfono real y dirección base; QR y PM2 siguen pendientes.
  - Progreso 2026-05-18: Maestro soporta estado `pending-qr` por `statusOverrides`; usarlo para Asturias hasta el día del QR.
- Commits: `bd76763`

### 🟢 Fase 5: Testing Pipeline (Prioridad Alta)

- [ ] **5.1 Probar ambos agentes localmente**
  - `node orchestrator.js start` con ambos enabled
  - Verificar: 2 QR distintos, 2 dashboards, comandos admin aislados
  - Probar media handling (imagen, video, emoji)
- [ ] **5.2 Deploy a testing (VPS)**
  - git push → pull en bot_testing
  - Configurar agents.override.json para puertos testing
- [ ] **5.3 Probar funcionalidad completa en testing**
  - Enviar mensajes desde WhatsApp real
  - Verificar notificaciones en tiempo real
  - Escanear QR de Asturias
  - Probar comandos admin por agente
- [ ] **5.4 Deploy a producción**
  - git push → pull en bot_dolce
  - PM2 restart
  - Dependency: 5.3 ✅

---

### ✅ Milestone 1: Dual Environment Setup (COMPLETED)
**Status**: Production Ready  
**Completion Date**: 2026-05-10

**Achievements:**
- ✅ Production environment running on VPS (bot_dolce)
- ✅ Testing environment configured (bot_testing)
- ✅ Separate ports and configurations
- ✅ Dashboards accessible (ports 3000 and 4000)
- ✅ WhatsApp sessions isolated
- ✅ PM2 process management configured

**Current Production Setup:**
- **Production**: http://2.24.89.243:3000 (bot_dolce)
- **Testing**: http://2.24.89.243:4000 (bot_testing)
- **Ports**: PRD (3011, 3000) | DEV (4011, 4000)

---

### ✅ Milestone 2: Multi-Tenant Architecture - Phase 1 (COMPLETED)
**Status**: Foundation Complete  
**Completion Date**: 2026-05-10  
**Priority**: High

**Phase 1 Achievements:**
- ✅ Multi-tenant directory structure created
- ✅ Bot template extracted and refactored
- ✅ Configuration system with JSON Schema validation
- ✅ Automatic port management system
- ✅ Deployment automation scripts
- ✅ Complete documentation

**Deployed on VPS:**
- **Location**: `/home/forma/multi-tenant/`
- **Port Manager**: ✅ Functional
- **Config Validator**: ✅ Functional
- **Template**: ✅ Ready for cloning
- **Production**: ✅ Unaffected (bot_dolce still running)

---
### ✅ Milestone 4: Dashboard Redesign (COMPLETADO)
**Status**: Rediseño finalizado con éxito  
**Completion Date**: 2026-05-12

**Achievements:**
- ✅ Sistema de diseño base (Tokens) creado
- ✅ Biblioteca de componentes Atoms implementada
- ✅ Layout responsive y moderno (Shell)
- ✅ Vistas de Chats, Conversación, Config y Stats rediseñadas
- ✅ Animaciones y micro-interacciones pulidas
- ✅ Auditoría de accesibilidad y performance realizada
- ✅ Login rediseñado y unificado

---


## Notes

### Recent Changes (2026-05-11)
- ✅ **Dashboard Humano v2 - Deploy a Producción Completado**
  - git pull + PM2 restart en VPS
  - Login y CSS verificados en http://2.24.89.243:3001
  - Mensajes renderizados correctamente con ancho 65%
- ✅ **Dashboard Admin Management - Fase 1 Backend Completa**
  - CRUD API endpoints en server.js (GET, POST, PUT, DELETE)
  - config/admin-numbers.json con datos migrados
  - admin-commands.js ahora lee desde JSON con file watcher y fallback a .env
  - agent-manager.js reconoce roles "admin" e "ignorado"
  - Script de migración: scripts/migrate-admin-numbers.js
  - Frontend: vista configuración con tabs, lista, modal agregar
  - API endpoints verificados localmente
- ✅ **Dashboard Admin Management - Deploy a Producción Completado** 2026-05-12
  - Fix: runtime data files removidos de git tracking (data/ en .gitignore)
  - Fix: chatCount null error corregido (faltaba en refactor tabs)
  - historial.json restaurado via SCP al VPS
  - Deploy verificado en http://2.24.89.243:3001
- ✅ Completed dual environment setup on VPS
- ✅ Fixed firewall configuration for dashboard access
- ✅ Configured separate `.env` files for PRD and DEV
- ✅ Updated `agents.json` with different ports per environment
- ✅ Modified `dashboard-central.js` to listen on `0.0.0.0`
- ✅ **Phase 1 Complete**: Multi-tenant foundation deployed to VPS
  - Created `/home/forma/multi-tenant/` structure
  - Port manager and config validator functional
  - Template ready for client cloning
  - Deployment automation scripts created
- ✅ **Dashboard Humano v2 - Login Fix Complete**
  - Identificada causa raíz: conflicto de puertos (dos servidores en puerto 3001)
  - Configurados usuarios con bcrypt en `config/agents.json`
  - Login funciona correctamente en local
  - Usuario `forma` / `forma2026` agregado
  - Listo para deploy a producción

### Recent Changes (2026-05-12)
- ✅ **Dashboard fixes — renderizado, CSS, config.js bug Completado**
  - conversation.js: debug logging + error handling
  - config.js: fix renderAdminNumbers() escribía en adminNumbersList
  - server.js: chat preview multi-formato (text || texto || parts[0].text)
  - Patrón de formato inconsistente documentado en .gsd/memory/patterns/
- ✅ **Fix envío de mensajes + WebSocket tiempo real Completado**
  - server.js: message/finish endpoints escriben directo a historial.json y pausas.json
  - agent-manager.js: notificarDashboard() via HTTP local al dashboard
  - Endpoint interno /api/internal/new-message + Socket.IO broadcast
  - Limpieza variable BOT_API_URL huérfana + debug logs
  - Template multi-tenant actualizada
- ✅ **Testing environment visual differentiation Completado**
  - AGENT_ID / DATA_PATH dinámicos por env var
  - Banner naranja + header negro + sufijo [TEST] en testing
  - Endpoint /api/env para detección frontend
  - Datos separados: testing usa data/testing/, prod usa data/santa-ana/
  - Deploy: DASHBOARD_HUMANO_PORT=4002 DASHBOARD_AGENT_ID=testing NODE_ENV=development

### Next Steps
1. **Immediate**: Deploy a VPS y verificar en producción
2. **Short-term**: Review and approve multi-tenant milestone
3. **Medium-term**: Begin implementation of multi-tenant architecture
4. **Long-term**: Scale to multiple clients

### Important Links
- [Multi-Tenant Milestone](.gsd/milestones/multi-tenant-architecture/MILESTONE.md)
- [Client Config Example](.gsd/milestones/multi-tenant-architecture/client-config-example.txt)
- [Client Add Script Example](.gsd/milestones/multi-tenant-architecture/client-add-script-example.sh)



---

## 📦 Milestone Documentation

### Multi-Tenant Architecture Milestone

Complete documentation package created in `.gsd/milestones/multi-tenant-architecture/`:

#### 📄 Available Documents

1. **[README.md](../milestones/multi-tenant-architecture/README.md)**
   - Documentation index
   - Quick start guide
   - Status overview

2. **[EXECUTIVE_SUMMARY.md](../milestones/multi-tenant-architecture/EXECUTIVE_SUMMARY.md)**
   - Business case and ROI
   - Time/cost savings analysis
   - Investment vs return
   - Recommendation

3. **[MILESTONE.md](../milestones/multi-tenant-architecture/MILESTONE.md)**
   - Complete implementation plan
   - 6 phases with detailed tasks
   - Timeline and deliverables
   - Risk assessment

4. **[ARCHITECTURE_DIAGRAM.md](../milestones/multi-tenant-architecture/ARCHITECTURE_DIAGRAM.md)**
   - Visual architecture overview
   - Current vs target comparison
   - Data flow diagrams
   - Scaling capacity

5. **[client-config-example.txt](../milestones/multi-tenant-architecture/client-config-example.txt)**
   - Example client configuration
   - Configuration schema
   - Best practices

6. **[client-add-script-example.sh](../milestones/multi-tenant-architecture/client-add-script-example.sh)**
   - Automated client onboarding script
   - Complete workflow example
   - Error handling

---

## 🎯 Key Takeaways

### Current State (As of 2026-05-10)
- ✅ Production environment operational
- ✅ Testing environment configured
- ✅ Dual environment setup complete
- ✅ Ready for phone number change tomorrow

### Future State (After Multi-Tenant Implementation)
- 🎯 Single codebase for all clients
- 🎯 Add client in < 5 minutes
- 🎯 Support 100+ clients
- 🎯 Centralized management
- 🎯 Automated operations

### Business Impact
- **96% faster** client onboarding
- **90% reduction** in maintenance costs
- **10x growth** potential
- **Foundation** for SaaS platform

---

## 🚀 Recommended Next Steps

### Immediate (Next 24 hours)
1. ✅ Handle Dolce Party phone number change
2. ✅ Test procedure in DEV environment
3. ✅ Document the process

### Short-term (Next week)
1. Review multi-tenant milestone documentation
2. Approve or request changes
3. Estimate resources and timeline
4. Schedule kickoff meeting

### Medium-term (Next 4-6 weeks)
1. Execute Phase 1: Core Refactoring
2. Build automation scripts
3. Create unified dashboard
4. Migrate existing clients
5. Complete documentation

### Long-term (3+ months)
1. Onboard new clients rapidly
2. Scale to 20+ clients
3. Optimize performance
4. Consider SaaS offering

---

## 📊 Success Criteria

The multi-tenant implementation will be considered successful when:

- [ ] Add new client in < 5 minutes
- [ ] Zero port conflicts
- [ ] All clients in single dashboard
- [ ] 100% data isolation verified
- [ ] Zero downtime during client operations
- [ ] Migration completed with zero data loss
- [ ] Documentation complete
- [ ] Team trained on new system

---

**Last Updated**: 2026-05-17
**Status**: Dashboard Maestro MVP — Fase 0 testing cerrada: persistencia, UI testing, backup-now y PM2 control demo validados. Santa Ana producción queda read-only.
**Next Milestone Review**: Fase 1 de SANTA_ANA_MIGRATION_CHECKLIST.md (backup manual producción + registro sin modificar procesos)
