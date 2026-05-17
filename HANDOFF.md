# 🚨 LEÉ ESTO PRIMERO — Instrucciones para el Agente

> **Proyecto**: Bot WhatsApp multi-agente para cotillón (Dolce Party)
> **Framework**: GSD (`.gsd/`) — No inventes tu propio plan, seguí el que existe.

> **También obligatorio**: leer `AGENTS.md`. Contiene las reglas operativas vigentes para agentes de código.

---

## 📋 REGLAS OBLIGATORIAS

### 1. LEÉ `IMPLEMENTATION_PLAN.md` AHORA
- `.gsd/state/IMPLEMENTATION_PLAN.md` → Única fuente de verdad sobre qué hay que hacer
- No empieces a codificar sin leer esto primero

### 1b. LEÉ `AGENTS.md`
- `AGENTS.md` → Reglas para pensar, editar, verificar y proteger runtime data
- Si contradice documentación archivada, `AGENTS.md` y los documentos GSD vigentes ganan

### 2. PLAN BEFORE YOU BUILD
- No toques código sin un plan
- Si el plan no existe: preguntale al usuario antes de crear uno

### 3. STATE IS SACRED
- Después de CADA acción: actualizá `.gsd/state/IMPLEMENTATION_PLAN.md`
- Si no actualizaste el estado, no terminaste la tarea

### 4. ATOMIC COMMITS
- `git commit -m "feat(scope): descripción"`
- Commits chicos, uno por funcionalidad

### 5. VERIFY EMPIRICALLY
- Probá lo que hacés. No digas "funciona" sin verificarlo.

### 6. NO TOQUES RUNTIME DATA
- `data/` está en `.gitignore` — son archivos generados por el bot
- `config/admin-numbers.json` y `config/agents.json` son configuración, se pueden editar

---

## 🗺️ MAPA DEL PROYECTO

```
HANDOFF.md                  ← Estás acá
.gsd/state/IMPLEMENTATION_PLAN.md   ← Tareas actuales
.gsd/memory/journal/        ← Historial de sesiones anteriores
.gsd/config/AGENTS.md       ← Comandos de build/test/ralph
.gsd/config/PROMPT_build.md ← Prompt de build del framework GSD

dashboard-humano-v2/        ← Dashboard humano (Express + Socket.IO)
  ├── server.js             ← Backend (API + WebSocket)
  ├── public/               ← Frontend (HTML + JS + CSS)
  └── middleware/auth.js    ← Autenticación JWT

lib/                        ← Módulos del bot
  ├── agent-manager.js      ← Clase principal del agente WhatsApp
  ├── admin-commands.js     ← Comandos admin + números ignorados
  └── control-manual.js     ← Sistema de pausas

config/                     ← Configuración
  ├── agents.json           ← Agentes y usuarios dashboard
  └── admin-numbers.json    ← Números admin/ignorados (CRUD desde dashboard)

data/santa-ana/             ← Runtime data (NO EDITAR, está en .gitignore)
```

---

## 🚦 ESTADO ACTUAL — Dashboard Maestro Testing

Última actualización operativa: **2026-05-17**.

- Rama local/remota: `main` sincronizada hasta `9371331`.
- VPS testing: `/home/forma/bot_testing` actualizado a `9371331`.
- `dashboard-maestro-testing` online en puerto interno `4050`.
- Testing activo real en Maestro: **solo `demo-local`**.
- `santa-ana` y `asturias` están **disabled por `enabledOverrides`** en `/home/forma/bot_testing/config/agents.override.json`.
- `bot-demo-local` online y WhatsApp connected.
- `bot-dolce-dev` stopped.
- `bot-dolce-prd` online: **no tocar**.
- Backup-now testing habilitado y probado.
- Backup validado: `/home/forma/backups-testing/bot_testing-20260517-183114.tar.gz`.
- **Persistencia implementada**: audit events y maintenance mutes se guardan en `data/dashboard-maestro/` (JSON). Sobreviven reinicio del Maestro.
- **UI testing actualizada**: banner `Testing · demo only` visible. Agentes disabled por override muestran badge `Off en testing`.
- PM2 control sigue **deshabilitado**. Pendiente validación SSH del nombre PM2 del dashboard demo.
- Producción intacta. No se conectó Maestro a `bot_dolce`.

### agents.override.json — VPS testing

Actualmente `/home/forma/bot_testing/config/agents.override.json` tiene `enabledOverrides` para apagar `santa-ana` y `asturias` en testing.

Para habilitar PM2 control, agregar `processOverrides` solo para `demo-local`:
```json
"processOverrides": {
  "demo-local": {
    "bot": "bot-demo-local"
  }
}
```

No incluir `dashboard` todavía — requiere validación SSH para determinar el nombre PM2 real del dashboard humano del demo (puerto 5011). Buscar en `pm2 describe` qué proceso tiene `DASHBOARD_HUMANO_PORT=5011`, `DASHBOARD_AGENT_ID=demo-local` o `CONFIG_AGENT_ID=demo-local`. Si no existe un PM2 separado (el dashboard lo levanta el orquestador), no configurar target `dashboard`.

Validar con `pm2 list` y `pm2 describe <nombre>` antes de agregar. Solo después habilitar `DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL=true` en testing.

### Próximas tareas seguras

1. **PM2 control demo-only (pendiente SSH)**
   - ✅ `processOverrides.demo-local` documentado con solo `bot: bot-demo-local`.
   - ✅ SSH a VPS testing: validado que `dashboard-dev` NO es dashboard humano demo; ejecuta `dashboard-central.js`.
   - ✅ Dashboard demo en puerto `5011` corre como proceso hijo de `bot-demo-local` (`dashboard-humano-v2/server.js`), sin PM2 separado.
   - ✅ `/home/forma/bot_testing/config/agents.override.json` tiene `processOverrides.demo-local.bot = bot-demo-local`.
   - ✅ `DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL=true` habilitado solo en `dashboard-maestro-testing`.
   - ⚠️ `dashboard:` queda sin configurar hasta crear/validar un PM2 separado para el dashboard demo.
   - ⚠️ Prueba `restart dashboard` sobre demo fue segura y auditada como error esperado: PM2 no encontró `dashboard-humano-demo-local-testing`.
   - ❌ No probar `stop` ni `restart` del bot demo desde Maestro mientras pueda estar en uso comercial.

2. **Persistencia/auditoría — COMPLETADO**
   - ✅ Audit events persistidos en `data/dashboard-maestro/audit-events.json`.
   - ✅ Maintenance mutes persistidos en `data/dashboard-maestro/maintenance-mutes.json`.
   - ✅ Arranque defensivo: si JSON corrupto o faltante, arranca vacío con `console.warn`.
   - ✅ Directorio `data/dashboard-maestro/` se crea automáticamente si no existe.
   - ✅ Validado en VPS: mute `demo-local` sobrevivió reinicio de `dashboard-maestro-testing`; luego fue removido y `maintenance-mutes.json` quedó `[]`.
   - ✅ Validado en VPS: eventos `backup-now`, `mute-alerts`, `unmute-alerts` y prueba PM2 quedaron en auditoría tras reinicio.
   - No migrar a SQLite todavía.

3. **Separar entornos en UI — COMPLETADO**
   - ✅ Banner `Testing · demo only` visible en cabecera del Maestro.
   - ✅ Badge `Off en testing` para agentes disabled por override.
   - ✅ `_overrideInfo` en el payload de agentes para que frontend distinga override vs disabled normal.

4. **Exposición externa**
   - Para MVP interno, seguir con túnel SSH.
   - Opciones futuras: abrir puerto `4050`, o mejor proxy reverso con HTTPS y auth.
   - No abrir exposición externa hasta cerrar PM2 control.

5. **Antes de tocar producción**
   - No conectar Maestro a `bot_dolce` todavía.
   - Primero completar: backup-now probado varias veces en testing, PM2 control probado solo en testing, audit persistente (✅) y checklist actualizado.
   - Backup-now testing ya tiene 3 ejecuciones exitosas: `bot_testing-20260517-183114.tar.gz`, `bot_testing-20260517-212752.tar.gz`, `bot_testing-20260517-212810.tar.gz`.

## 🚀 PRÓXIMOS PASOS (si no hay una tarea activa)

1. **Dashboard Maestro**: SSH a VPS testing — validar nombre PM2 del dashboard demo, agregar a `agents.override.json`, habilitar PM2 control, probar restart demo dashboard.
2. **Dashboard Maestro**: push a `main`, deploy a `bot_testing`, validar persistencia y UI en VPS.
3. **Santa Ana integración (preparación)**: seguir checklist en `.gsd/milestones/multi-tenant-architecture/SANTA_ANA_MIGRATION_CHECKLIST.md`. Primero Fase 0 (precondiciones testing), luego Fase 1 (backup producción + registro).

## 📐 Modelo Tenant — Documentado

Ver `.gsd/milestones/multi-tenant-architecture/TENANT_MODEL.md` para el modelo conceptual `cliente -> agente/local`.

Por ahora es documentación. No hay migración de datos ni cambios productivos.

Estructura futura de cliente (no activa):
```text
multi-tenant/clients/{clientId}/
  ├── client.json
  └── agents.json
```
Ejemplo conceptual en `multi-tenant/clients/dolce-party.example.json`.

## 📋 Checklist Migración Santa Ana

Ver `.gsd/milestones/multi-tenant-architecture/SANTA_ANA_MIGRATION_CHECKLIST.md`.
Baseline read-only actual: `.gsd/milestones/multi-tenant-architecture/SANTA_ANA_PRODUCTION_BASELINE.md`.

Fases:
- **Fase 0**: Precondiciones testing (demo-local estable, backup-now probado, PM2 control probado, auditoría persistente, UI testing clara)
- **Fase 1**: Preparación producción read-only (backup manual, registrar PM2 y rutas, no modificar)
- **Fase 2**: Alta en Maestro read-only (health checks, métricas, sin botones destructivos)
- **Fase 3**: Backup producción desde Maestro (habilitar backup-now solo producción, probar una vez)
- **Fase 4**: Control PM2 producción (solo si testing probado, empezar por restart dashboard)

Estado baseline Santa Ana 2026-05-17:
- `dashboard-humano-santa-ana` online, script `/home/forma/bot_dolce/dashboard-humano-v2/server.js`, puerto `3001`.
- `bot-dolce-prd` online, script `/home/forma/bot_dolce/orchestrator.js`, bot API `3011`.
- `GET http://127.0.0.1:3001/index.html` responde `200 OK`.
- `GET http://127.0.0.1:3011/status` responde `agentId: santa-ana`, `isRunning: true`, `globalPausado: false`.
- Captura usuario confirma panel visual cargado con `Chats`, `Config`, `Stats` y conversación abierta.
- Pendiente prueba manual interna: login/logout, envío humano, finalizar conversación, config y stats.
- Integración Maestro debe ser read-only primero: monitorear y enlazar el panel `3001`, no reemplazarlo.

Estado integración Maestro read-only 2026-05-17:
- `dashboard-maestro-testing` lista agente adicional `santa-ana-prod`.
- `santa-ana-prod`: `clientId=dolce-party`, `environment=production`, `readOnly=true`.
- Health Maestro OK: bot API `3011` up, dashboard humano `3001` up, overall `ok`.
- Link de panel: `http://2.24.89.243:3001/index.html`.
- PM2 names registrados solo para referencia: `bot-dolce-prd`, `dashboard-humano-santa-ana`.
- Acciones PM2 bloqueadas por código para read-only. Prueba `restart dashboard` fue rechazada con `Agente read-only: acciones PM2 deshabilitadas` y quedó auditada.
- Producción intacta: `bot-dolce-prd` y `dashboard-humano-santa-ana` siguieron online.

---

## 📌 AGENTES ESPECIALES

### demo-local (testing VPS)
- **Propósito**: Demo para clientes potenciales probar el bot
- **ID**: `demo-local` | **Puertos**: API 5010, Dashboard 5011
- **WhatsApp**: 11 7145-8944 | Sesión: `.wwebjs_auth_testing/demo-session/`
- **Sin catálogo** (no es un cotillón real)
- **Admin numbers**: Si querés que NO herede admins del `.env`, creá `data/{agent-id}/admin-numbers.json` con `{"admins":[]}`
- Dashboard: `http://2.24.89.243:5011`

### Demo comercial neutral

Implementación desplegada y probada en `bot_testing` VPS el 2026-05-17.

- `demo-local` usa flujo propio en `lib/agent-manager.js` y mensajes en `flujos.js`.
- Primer mensaje: informa que es una demo del sistema, no una tienda real.
- Segunda interacción: responde una muestra corta y cierra el recorrido.
- No entra al menú de pedidos/paquetería ni usa catálogo Dolce Party.
- `config/agents.json` ya no describe el demo como “Dolce Party”; usa “Demo del sistema de atención por WhatsApp”.
- Mantenerlo aislado de `santa-ana`, `asturias` y producción.
- Deploy testing: copiados `flujos.js`, `lib/agent-manager.js` y `config/agents.json` a `/home/forma/bot_testing`; reiniciado solo `bot-demo-local`.
- Verificación VPS: `node --check` OK, PM2 `bot-demo-local` online, `GET http://127.0.0.1:5010/status` responde `whatsapp.status: connected`.
- Prueba manual WhatsApp OK con `11 7145-8944`: primer mensaje informa demo, segundo responde muestra y cierra, tercero indica demo finalizada.

### Fix conocido: express.static en dashboard-humano-v2
`dashboard-humano-v2/server.js` usa `path.join(__dirname, 'public')` en vez de `'public'` a secas. Si no, cuando el orquestador lanza el dashboard como proceso hijo, el cwd no es `dashboard-humano-v2/` y no encuentra la carpeta `public/`.

---

## ⚠️ ERRORES COMETIDOS POR AGENTES ANTERIORES (no los repitas)

| Error | Consecuencia | Cómo evitarlo |
|-------|-------------|---------------|
| No leer IMPLEMENTATION_PLAN.md | Hicieron tareas incorrectas | Leer el plan primero |
| Commits enormes sin dividir | 250+ archivos en 1 commit | Commits atómicos |
| Trackear runtime data | `git pull` pisó historial producción | `data/` en `.gitignore` |
| No verificar empíricamente | Bugs que parecían fixes | Probar antes de commitear |
| Codificar sin plan XML | Refactor innecesario | Plan antes de código |

---

**¿Ya leíste `IMPLEMENTATION_PLAN.md`? Hacelo ahora antes de seguir.**
