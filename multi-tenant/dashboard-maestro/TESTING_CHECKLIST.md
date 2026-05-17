# Dashboard Maestro - Testing Checklist

## Local smoke test

- [ ] Correr `npm start` desde `multi-tenant/dashboard-maestro/`.
- [ ] Abrir `http://localhost:3050`.
- [ ] Login con credenciales locales o variables `DASHBOARD_MAESTRO_USER` / `DASHBOARD_MAESTRO_PASS`.
- [ ] Ver agentes de `config/agents.json`.
- [ ] Confirmar que `santa-ana` y `asturias` aparecen con puertos y paths.
- [ ] Confirmar que agentes deshabilitados por `enabledOverrides` no generan alertas ni semáforo crítico.
- [ ] Confirmar que `/health` responde sin auth.
- [ ] Confirmar que `/api/agents` requiere auth.
- [ ] Confirmar que Socket.IO sin auth no permite handshake.

## Read-only data checks

- [ ] Health muestra Bot API y Dashboard humano por agente.
- [ ] Si servicios locales están apagados, las alertas `bot-down` y `dashboard-down` aparecen.
- [ ] Métricas leen `estadisticas.json` si existe.
- [ ] Si no hay instrumentación de IA/costo, la UI muestra `Sin datos`.
- [ ] Handoffs leen `pausas.json` en modo read-only.
- [ ] Handoff con espera mayor a 10 minutos genera alerta crítica.
- [ ] Estado WhatsApp muestra `connected`, `disconnected`, `authenticated`, `qr` o `auth_failure` si `/status` expone `whatsapp.status`.
- [ ] Estado WhatsApp `disconnected` o `auth_failure` genera alerta crítica.
- [ ] Estado WhatsApp queda `unknown` si `/status` no lo expone.

## Guarded actions

- [ ] Con defaults, PM2 control aparece deshabilitado.
- [ ] POST a `/api/agents/:id/actions` devuelve 403 si `DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL` no está activo.
- [ ] El rechazo queda registrado en auditoría.
- [ ] Con defaults, backup-now aparece deshabilitado.
- [ ] POST a `/api/backups/now` devuelve 403 si `DASHBOARD_MAESTRO_ENABLE_BACKUP_NOW` no está activo.
- [ ] El rechazo queda registrado en auditoría.
- [ ] Mute/unmute de alertas por agente funciona y queda auditado.

## Testing VPS only

No ejecutar esto contra producción.

Variables mínimas esperadas en `bot_testing`:

```bash
DASHBOARD_MAESTRO_PORT=4050
DASHBOARD_MAESTRO_USER=<usuario-no-default>
DASHBOARD_MAESTRO_PASS=<password-no-default>
DASHBOARD_MAESTRO_PM2_ENV=testing
DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL=true
DASHBOARD_MAESTRO_ENABLE_BACKUP_NOW=true
DASHBOARD_MAESTRO_BACKUP_SCRIPT=scripts/backup-testing.sh
```

- [ ] Confirmar nombres PM2 reales antes de habilitar control.
- [x] Declarar nombres PM2 reales en `config/agents.override.json` usando `processOverrides`.
  - 2026-05-17: `demo-local.bot = bot-demo-local`.
  - 2026-05-17: dashboard demo no tiene PM2 separado; corre como hijo de `bot-demo-local` (`dashboard-humano-v2/server.js`, puerto 5011).
- [x] Ejecutar una acción PM2 no crítica en testing.
  - 2026-05-17: `restart dashboard` sobre `demo-local` probado como validación segura; no tocó procesos porque el target resuelto no existe (`dashboard-humano-demo-local-testing`).
  - Resultado esperado actual: error auditado. Pendiente crear PM2 separado si se requiere restart de dashboard demo desde Maestro.
- [x] Confirmar auditoría de acción PM2.
  - 2026-05-17: evento auditado con `result: error` por target dashboard inexistente; esto confirma la ruta de auditoría sin afectar demo.
- [x] Ejecutar backup-now en testing.
  - 2026-05-17: backups exitosos adicionales `bot_testing-20260517-212752.tar.gz` y `bot_testing-20260517-212810.tar.gz`.
- [x] Confirmar archivo timestamped.
- [x] Confirmar que incluye runtime data y `.wwebjs_auth/`.
- [ ] Confirmar que restore desde UI no existe.

## Persistence checks

- [x] Audit events persisten en `data/dashboard-maestro/audit-events.json`.
  - 2026-05-17: backup-now y mute/unmute siguen visibles después de reiniciar `dashboard-maestro-testing`.
- [x] Maintenance mutes persisten en `data/dashboard-maestro/maintenance-mutes.json`.
  - 2026-05-17: mute de prueba `demo-local` sobrevivió reinicio de Maestro.
  - 2026-05-17: mute de prueba removido después de validar; archivo quedó `[]`.

## Production guardrail

- [ ] No correr Maestro contra `bot_dolce` sin aprobación explícita.
- [ ] No habilitar PM2 control en producción durante MVP local/testing.
- [ ] No usar `scripts/backup.sh` hardcodeado a `/home/forma/bot_dolce` como backup script de testing.
- [ ] Usar `scripts/backup-testing.sh` para backup-now de `bot_testing`.
