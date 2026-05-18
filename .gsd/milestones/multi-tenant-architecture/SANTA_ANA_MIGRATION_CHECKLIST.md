# Santa Ana Migration Checklist

> Checklist para integrar Santa Ana producción al Dashboard Maestro sin migrar datos ni interrumpir servicio.
> Cada fase debe completarse y verificarse antes de pasar a la siguiente.

---

## Fase 0 — Precondiciones Testing

Todo esto debe estar completado en `bot_testing` antes de tocar producción:

- [x] `demo-local` estable con WhatsApp conectado y dashboard accesible
- [x] Backup-now probado al menos 3 veces en testing con resultados exitosos
- [x] PM2 control probado en testing
  - 2026-05-17: PM2 control habilitado solo en `dashboard-maestro-testing`.
  - 2026-05-17: `demo-local.bot` mapeado a `bot-demo-local`.
  - 2026-05-17: dashboard demo en puerto `5011` no tiene PM2 separado; corre como hijo de `bot-demo-local`.
  - 2026-05-17: `restart bot` sobre `demo-local` ejecutado desde Maestro; PM2 target `bot-demo-local`, auditoría `success`.
  - 2026-05-17: post-check OK: PM2 online, `/status` `isRunning=true`, WhatsApp `connected`, dashboard demo `5011` responde `200`.
  - Excepción aceptada para Fase 0: no se probó `restart dashboard` real porque no existe PM2 separado para el dashboard demo.
- [x] Auditoría persistente — eventos sobreviven reinicio del Maestro
- [x] Maintenance mutes persistentes — sobreviven reinicio
- [x] UI distingue testing de producción (banner `Testing · demo only`, badges de entorno)
- [x] Maestro solo opera sobre `demo-local` — no afecta Santa Ana testing ni producción
- [x] Checklist de Maestro en testing (TESTING_CHECKLIST.md) verde para VPS testing

**Verificación**: abrir Maestro por túnel SSH, confirmar que todo está OK y que `santa-ana` y `asturias` aparecen como disabled por override.

---

## Fase 1 — Preparación Producción Read-Only

Antes de que el Maestro toque producción:

- [x] **Backup manual completo** de `bot_dolce`:
  ```bash
  tar czf ~/backups-prod/bot_dolce-pre-maestro-$(date +%Y%m%d-%H%M%S).tar.gz \
    -C /home/forma bot_dolce
  ```
  Incluir: `data/`, `logs/`, `config/`, `.wwebjs_auth/`, `.env`, `package.json`, `node_modules/` (o solo lockfile).
  Guardar en `/home/forma/backups-prod/`.
  - 2026-05-17: backup manual creado y validado:
    `/home/forma/backups-prod/bot_dolce-pre-maestro-20260517-232344.tar.gz`.
  - Tamaño final: `406900359 bytes` (~389 MB).
  - Validación: `tar tzf ... >/dev/null` devolvió `TAR_OK`.
  - Producción siguió online: `bot-dolce-prd` y `dashboard-humano-santa-ana`.

- [x] Registrar **nombres PM2 reales** de producción:
  ```bash
  pm2 list
  pm2 describe bot-dolce-prd   # o el nombre real del bot Santa Ana
  pm2 describe dashboard-humano-v2  # o el nombre real del dashboard
  ```
  Documentar cada nombre y su propósito.
  - 2026-05-17 baseline read-only:
    - Bot: `bot-dolce-prd`.
    - Dashboard humano: `dashboard-humano-santa-ana`.
    - Ver detalles en `SANTA_ANA_PRODUCTION_BASELINE.md`.

- [x] Registrar **rutas actuales**:
  - Repo/CWD producción → `/home/forma/bot_dolce`
  - `data` agente → `/home/forma/bot_dolce/data/santa-ana`
  - `logs` agente → `/home/forma/bot_dolce/logs/santa-ana`
  - `catalog` → `/home/forma/bot_dolce/catalogs/catalogo-santa-ana.js`
  - stats → `/home/forma/bot_dolce/data/estadisticas.json`
  - pausas globales/dashboard → `/home/forma/bot_dolce/data/pausas.json`
  - `.wwebjs_auth` → `/home/forma/bot_dolce/.wwebjs_auth/session-santa-ana-session`
  - Dashboard humano → `/home/forma/bot_dolce/dashboard-humano-v2`
  - Bot PM2 → `bot-dolce-prd`, script `/home/forma/bot_dolce/orchestrator.js`, CWD `/home/forma/bot_dolce`
  - Dashboard PM2 → `dashboard-humano-santa-ana`, script `/home/forma/bot_dolce/dashboard-humano-v2/server.js`, CWD `/home/forma/bot_dolce/dashboard-humano-v2`
  - 2026-05-18: rutas y PM2 verificados por SSH read-only; ambos procesos online.

- [ ] **Validar dashboard humano actual**: acceder vía navegador, confirmar que login, conversaciones y estadísticas funcionan.
  - 2026-05-17 read-only: `GET http://127.0.0.1:3001/index.html` responde `HTTP 200 OK`.
  - 2026-05-17 captura usuario: panel autenticado como `Administrador`, tabs `Chats`, `Config`, `Stats`, lista de chats y conversación abierta.
  - Pendiente: prueba manual de acciones internas (login/logout, envío humano, finish, config, stats).

- [ ] **No modificar procesos ni config.** Esta fase es solo registro y backup.
  - 2026-05-17: cumplido durante backup manual; no se reinició ni modificó producción.

---

## Fase 2 — Alta en Maestro Read-Only

El Maestro comienza a listar Santa Ana producción como agente observable:

- [x] El Maestro (corriendo en testing) lista Santa Ana producción desde `config/agents.json`
  - 2026-05-17: listado como `additionalAgent` en `config/agents.override.json` con id `santa-ana-prod`.
- [x] Health check a bot API de Santa Ana (puerto 3011) funciona desde testing VPS
- [x] Health check a dashboard humano de Santa Ana (puerto 3001) funciona
- [x] Métricas read-only (`estadisticas.json`) se muestran correctamente
  - 2026-05-17: Maestro lee `/home/forma/bot_dolce/data/estadisticas.json` mediante `paths.stats`.
  - Valores actuales en 0 porque el archivo productivo no tiene actividad de hoy.
- [x] Sin botones destructivos habilitados (stop, start, restart)
  - 2026-05-17: `readOnly=true` bloquea acciones PM2 en backend.
- [x] Sin PM2 control habilitado para Santa Ana
  - 2026-05-17: PM2 control global está habilitado en testing, pero `santa-ana-prod` rechaza acciones por `readOnly`.
- [x] La UI muestra `producción` o `Santa Ana · Producción` claramente diferenciado
  - 2026-05-17: UI muestra badges `production` y `read-only`, y link `Abrir panel`.

**Precaución**: el Maestro corre en `bot_testing`. Los health checks a Santa Ana producción son llamadas HTTP internas en el mismo VPS. No deben escribir nada.

**Riesgo conocido**: si el bot API de Santa Ana no responde a requests desde localhost (por firewall, bind address o auth), puede aparecer como `down`. Documentar como hallazgo, no como error crítico.

---

## Fase 3 — Backup Producción desde Maestro

- [ ] Habilitar `DASHBOARD_MAESTRO_ENABLE_BACKUP_NOW=true` solo para el script de producción
- [ ] Crear o reutilizar `scripts/backup-production.sh` con guardrail que verifique que opera sobre `bot_dolce`
- [ ] Configurar `DASHBOARD_MAESTRO_BACKUP_SCRIPT=scripts/backup-production.sh` en el Maestro
- [ ] Probar backup-now desde Maestro una vez con confirmación explícita
- [ ] Verificar archivo generado en `/home/forma/backups-prod/`
- [ ] Verificar que el backup incluye runtime data, `.wwebjs_auth/` y config
- [ ] Registrar auditoría del evento

**Regla**: no hacer backup-now productivo sin que el usuario lo confirme en el momento. No automatizar backups productivos desde el Maestro sin aprobación.

---

## Fase 4 — Control PM2 Producción (Solo si testing está probado)

- [x] PM2 control debe haber sido probado en testing antes de producción
  - 2026-05-17: probado con `restart bot` sobre `demo-local`; `restart dashboard` demo queda como mejora futura porque `5011` no tiene PM2 separado.
- [ ] Nombres PM2 de producción deben estar validados y mapeados en `processOverrides`
- [ ] Habilitar `DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL=true` en el entorno de producción del Maestro
- [ ] **Probar primero**: restart del dashboard humano de Santa Ana (acción de bajo riesgo)
- [ ] Verificar que dashboard humano se recupera solo
- [ ] Verificar auditoría registra el evento correctamente
- [ ] **No probar stop sobre el bot** mientras esté en uso comercial
- [ ] Documentar procedimiento de rollback:
  ```bash
  pm2 start bot-dolce-prd   # si se detuvo
  pm2 start dashboard-humano-v2  # si se detuvo
  ```

**Regla**: stop sobre bot Santa Ana solo cuando esté explícitamente autorizado y fuera de horario comercial.

---

## Resumen de Estados

| Fase | Estado |
|------|--------|
| Fase 0 — Precondiciones testing | ✅ Cerrada para testing |
| Fase 1 — Preparación producción | ⏳ Parcial: backup, PM2 y rutas registrados |
| Fase 2 — Alta Maestro read-only | ✅ Completada |
| Fase 3 — Backup desde Maestro | ⏳ Pendiente |
| Fase 4 — Control PM2 producción | 🔒 Bloqueado hasta decisión explícita |

---

## Notas

- Santa Ana producción tiene clientes reales. Cualquier acción sobre él debe hacerse con backup previo, en horario de bajo tráfico y con el usuario presente.
- El checklist asume que el Maestro corre en el mismo VPS que `bot_dolce` o tiene acceso de red a sus puertos.
- Si el Maestro se despliega como app separada (no dentro de `bot_testing` o `bot_dolce`), actualizar rutas y accesos.
