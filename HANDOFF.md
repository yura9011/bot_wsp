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

- Rama local/remota: `main` sincronizada hasta `26508f2`.
- VPS testing: `/home/forma/bot_testing` actualizado a `26508f2`.
- `dashboard-maestro-testing` online en puerto interno `4050`.
- Testing activo real en Maestro: **solo `demo-local`**.
- `santa-ana` y `asturias` están **disabled por `enabledOverrides`** en `/home/forma/bot_testing/config/agents.override.json`.
- `bot-demo-local` online y WhatsApp connected.
- `bot-dolce-dev` stopped.
- `bot-dolce-prd` online: **no tocar**.
- Backup-now testing habilitado y probado.
- Backups testing validados: `bot_testing-20260517-183114.tar.gz`, `bot_testing-20260517-212752.tar.gz`, `bot_testing-20260517-212810.tar.gz`, `bot_testing-20260517-224545.tar.gz`.
- **Persistencia implementada**: audit events y maintenance mutes se guardan en `data/dashboard-maestro/` (JSON). Sobreviven reinicio del Maestro.
- **UI testing actualizada**: banner `Testing · demo only` visible. Agentes disabled por override muestran badge `Off en testing`.
- PM2 control está habilitado **solo en testing** y fue probado con `restart bot` sobre `demo-local`.
- Maestro soporta estado `pending-qr` por `statusOverrides`; usarlo para agentes preparados pero sin WhatsApp escaneado.
- Backup productivo desde Maestro está preparado en `scripts/backup-production.sh`, pero **no habilitado** por env ni ejecutado desde UI.
- Producción sigue read-only desde Maestro; no habilitar PM2 control productivo.
- Producción intacta. No se conectó Maestro a `bot_dolce`.
- Backup manual productivo validado: `/home/forma/backups-prod/bot_dolce-pre-maestro-20260517-232344.tar.gz` (`406900359 bytes`, `TAR_OK`).
- Rutas productivas Santa Ana registradas: repo `/home/forma/bot_dolce`, auth `.wwebjs_auth/session-santa-ana-session`, data/logs/catalog/dashboard y PM2 exactos.
- Asturias preconfigurado en `config/agents.json` con teléfono `5493513114575`; QR y PM2 siguen pendientes.

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

No incluir `dashboard`: ya se validó que el dashboard humano demo del puerto `5011` corre como proceso hijo de `bot-demo-local`, no como PM2 separado.

`DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL=true` está habilitado solo en `dashboard-maestro-testing`.

### Próximas tareas seguras

1. **PM2 control demo-only — COMPLETADO EN TESTING**
   - ✅ `processOverrides.demo-local` documentado con solo `bot: bot-demo-local`.
   - ✅ SSH a VPS testing: validado que `dashboard-dev` NO es dashboard humano demo; ejecuta `dashboard-central.js`.
   - ✅ Dashboard demo en puerto `5011` corre como proceso hijo de `bot-demo-local` (`dashboard-humano-v2/server.js`), sin PM2 separado.
   - ✅ `/home/forma/bot_testing/config/agents.override.json` tiene `processOverrides.demo-local.bot = bot-demo-local`.
   - ✅ `DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL=true` habilitado solo en `dashboard-maestro-testing`.
   - ⚠️ `dashboard:` queda sin configurar porque no existe PM2 separado para el dashboard demo.
   - ⚠️ Prueba `restart dashboard` sobre demo fue segura y auditada como error esperado: PM2 no encontró `dashboard-humano-demo-local-testing`.
   - ✅ Prueba real `restart bot` sobre `demo-local` ejecutada desde Maestro: PM2 target `bot-demo-local`, auditoría `success`.
   - ✅ Post-check: `bot-demo-local` online, `/status` `isRunning=true`, WhatsApp `connected`, dashboard demo `5011` HTTP `200`.
   - ❌ No probar `stop` sobre el bot demo mientras pueda estar en uso comercial.

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
   - No abrir exposición externa todavía; para MVP interno seguir por túnel SSH.

5. **Antes de tocar producción**
   - No conectar Maestro a `bot_dolce` todavía.
   - Testing ya tiene backup-now, PM2 control demo y audit persistente validados.
   - Backup productivo manual ya existe y fue validado; antes de escribir en producción sigue haciendo falta confirmación explícita y ventana controlada.
   - Backup-now testing ya tiene 3 ejecuciones exitosas: `bot_testing-20260517-183114.tar.gz`, `bot_testing-20260517-212752.tar.gz`, `bot_testing-20260517-212810.tar.gz`.

## 🚀 PRÓXIMOS PASOS (si no hay una tarea activa)

1. **Santa Ana integración (Fase 1)**: completar registro final de rutas actuales; backup manual y PM2 ya están validados.
2. **Dashboard Maestro**: mantener acceso por túnel SSH; no exponer puerto `4050` hasta decidir HTTPS/auth.
3. **Mejora futura opcional**: crear PM2 separado para dashboard demo `5011` si se necesita reiniciarlo sin reiniciar `bot-demo-local`.
4. **Asturias**: dejar pendiente hasta la semana de alta; número real `5493513114575`, QR pendiente, sin PM2 nuevo ni operación comercial todavía.
   - Runbook operativo: `.gsd/milestones/multi-tenant-architecture/ASTURIAS_ONBOARDING_RUNBOOK.md`.
   - `config/agents.json` ya tiene teléfono real y dirección base acordada.
5. **Exposición Maestro**: seguir `.gsd/milestones/multi-tenant-architecture/MAESTRO_EXPOSURE_PLAN.md`; falta dominio/subdominio y lista de usuarios.

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
Checklist reusable de altas: `.gsd/milestones/multi-tenant-architecture/AGENT_ONBOARDING_CHECKLIST.md`.

## 📋 Checklist Migración Santa Ana

Ver `.gsd/milestones/multi-tenant-architecture/SANTA_ANA_MIGRATION_CHECKLIST.md`.
Baseline read-only actual: `.gsd/milestones/multi-tenant-architecture/SANTA_ANA_PRODUCTION_BASELINE.md`.

Fases:
- **Fase 0**: ✅ Cerrada para testing (demo-local estable, backup-now probado, PM2 control demo probado, auditoría persistente, UI testing clara)
- **Fase 1**: Preparación producción read-only (backup manual, registrar PM2 y rutas, no modificar)
- **Fase 2**: Alta en Maestro read-only (health checks, métricas, sin botones destructivos)
- **Fase 3**: Backup producción desde Maestro (habilitar backup-now solo producción, probar una vez)
- **Fase 4**: Control PM2 producción (solo si testing probado, empezar por restart dashboard)

Estado baseline Santa Ana 2026-05-17:
- `dashboard-humano-santa-ana` online, script `/home/forma/bot_dolce/dashboard-humano-v2/server.js`, puerto `3001`.
- `bot-dolce-prd` online, script `/home/forma/bot_dolce/orchestrator.js`, bot API `3011`.
- Auth WhatsApp: `/home/forma/bot_dolce/.wwebjs_auth/session-santa-ana-session`.
- Data/logs/catalog: `/home/forma/bot_dolce/data/santa-ana`, `/home/forma/bot_dolce/logs/santa-ana`, `/home/forma/bot_dolce/catalogs/catalogo-santa-ana.js`.
- `GET http://127.0.0.1:3001/index.html` responde `200 OK`.
- `GET http://127.0.0.1:3011/status` responde `agentId: santa-ana`, `isRunning: true`, `globalPausado: false`.
- Captura usuario confirma panel visual cargado con `Chats`, `Config`, `Stats` y conversación abierta.
- Pendiente prueba manual interna: login/logout, envío humano, finalizar conversación, config y stats.
- Integración Maestro debe ser read-only primero: monitorear y enlazar el panel `3001`, no reemplazarlo.
- Backup manual productivo validado: `/home/forma/backups-prod/bot_dolce-pre-maestro-20260517-232344.tar.gz`.

Estado integración Maestro read-only 2026-05-17:
- `dashboard-maestro-testing` lista agente adicional `santa-ana-prod`.
- `santa-ana-prod`: `clientId=dolce-party`, `environment=production`, `readOnly=true`.
- Health Maestro OK: bot API `3011` up, dashboard humano `3001` up, overall `ok`.
- Link de panel: `http://2.24.89.243:3001/index.html`.
- PM2 names registrados solo para referencia: `bot-dolce-prd`, `dashboard-humano-santa-ana`.
- Acciones PM2 bloqueadas por código para read-only. Prueba `restart dashboard` fue rechazada con `Agente read-only: acciones PM2 deshabilitadas` y quedó auditada.
- Producción intacta: `bot-dolce-prd` y `dashboard-humano-santa-ana` siguieron online.
- Mejora read-only posterior: Maestro soporta `paths.stats` y `paths.pauses` para leer archivos absolutos de producción sin cambiar `data`.
- `santa-ana-prod` en VPS testing apunta `stats` a `/home/forma/bot_dolce/data/estadisticas.json` y `pauses` a `/home/forma/bot_dolce/data/pausas.json`.
- Métricas y handoffs ya no muestran “archivo no encontrado”; quedan en 0 porque los archivos actuales no tienen actividad de hoy.
- WhatsApp de producción ahora muestra `running` con detalle `Bot activo; WhatsApp no expuesto por /status` en vez de `unknown`.

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

### asturias (pendiente alta)

- Número real confirmado: `5493513114575`.
- QR pendiente para la semana de alta; no escanear ahora.
- No levantar PM2 nuevo ni activar operación comercial todavía.
- Usar mismos datos base que Santa Ana por ahora: dirección `Sta. Ana 2637, X5010EEK Córdoba`, horarios y admins.
- Catálogo compartido aceptado por ahora: `catalogs/catalogo-santa-ana.js`.
- `config/agents.json` ya está preconfigurado con teléfono real y dirección base.
- Maestro debe mostrarlo como `pending-qr` en testing hasta escanear QR.
- Runbook de alta: `.gsd/milestones/multi-tenant-architecture/ASTURIAS_ONBOARDING_RUNBOOK.md`.

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
