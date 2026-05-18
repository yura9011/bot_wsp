# Asturias Onboarding Runbook

> Alta operativa pendiente para Dolce Party - Asturias.
> Estado: preparado en documentación, no ejecutar hasta tener el teléfono para QR.
> Fecha: 2026-05-17

## Datos Confirmados

- Agente: `asturias`
- Nombre visible: `Dolce Party - Asturias`
- WhatsApp real: `5493513114575`
- Dirección por ahora: `Sta. Ana 2637, X5010EEK Córdoba`
- Horario: mismo que Santa Ana
- Catálogo: `catalogs/catalogo-santa-ana.js`
- Dashboard users: mantener `admin` y `forma`
- Admin WhatsApp: mismos que Santa Ana por ahora
- Puertos producción actuales en `config/agents.json`: API `3012`, dashboard `3002`
- Sesión WhatsApp: `asturias-session`

## Reglas

- No escanear QR hasta la semana de alta.
- No levantar PM2 nuevo antes del QR.
- No copiar historial ni pausas desde Santa Ana.
- No tocar `bot_dolce` producción sin backup vigente y confirmación explícita.
- Decisión actual: no activar Asturias en testing; preparar alta directa a producción cuando el QR esté disponible.
- Si más adelante se decide probar en testing, usar overrides/puertos testing y no mezclar con Santa Ana producción.
- Mientras QR esté pendiente, Maestro debe mostrar Asturias como `pending-qr`, no como agente activo ni alerta.

## Pre-Checklist

- [ ] Confirmar que el número `5493513114575` está disponible para escanear QR.
- [ ] Confirmar si Asturias usará el mismo catálogo de Santa Ana en producción.
- [ ] Confirmar si mantiene dirección/horarios/admins compartidos con Santa Ana.
- [ ] Backup productivo vigente disponible.
  - Backup actual validado: `/home/forma/backups-prod/bot_dolce-pre-maestro-20260517-232344.tar.gz`.
- [ ] Confirmar ventana de baja actividad para el alta.

## Config Pendiente Antes de Alta

`config/agents.json` ya quedó preconfigurado para Asturias:

- `asturias.info.telefono = "5493513114575"`
- `asturias.info.direccion = "Sta. Ana 2637, X5010EEK Córdoba"`
- `asturias.paths.catalog = "catalogs/catalogo-santa-ana.js"`

No escanear QR ni levantar PM2 hasta la semana de alta.

Commit de preconfiguración:

```bash
git add config/agents.json HANDOFF.md .gsd/state/IMPLEMENTATION_PLAN.md .gsd/milestones/multi-tenant-architecture/ASTURIAS_ONBOARDING_RUNBOOK.md
git commit -m "config(asturias): prepare whatsapp number"
git push origin main
```

## Alta En Testing Opcional

Estado actual: no usar este camino salvo decisión explícita. Objetivo si se habilita: validar QR, bot, dashboard y flujo sin afectar Santa Ana producción.

1. En VPS testing:
   ```bash
   cd /home/forma/bot_testing
   git pull --ff-only origin main
   ```

2. Revisar `config/agents.override.json`:
   - Si `asturias` está deshabilitado por `enabledOverrides`, cambiarlo temporalmente a `true` o quitar el override solo durante la prueba.
   - Quitar `statusOverrides.asturias = "pending-qr"` cuando se vaya a escanear QR.
   - Mantener Santa Ana testing deshabilitado.

3. Levantar bot Asturias testing:
   ```bash
   cd /home/forma/bot_testing
   pm2 start orchestrator.js --name bot-asturias-testing -- start asturias
   ```

4. Levantar dashboard humano testing si no lo levanta el orquestador o si se requiere PM2 separado:
   ```bash
   cd /home/forma/bot_testing
   bash scripts/start-dashboard-asturias-testing.sh
   ```

5. Escanear QR desde logs del bot:
   ```bash
   pm2 logs bot-asturias-testing
   ```

6. Verificar:
   ```bash
   curl http://127.0.0.1:4012/status
   curl -o /dev/null -s -w "%{http_code}\n" http://127.0.0.1:4003/index.html
   pm2 status bot-asturias-testing dashboard-humano-asturias-testing
   ```

7. Prueba manual:
   - Enviar mensaje al WhatsApp de Asturias.
   - Confirmar respuesta del bot.
   - Login dashboard testing.
   - Abrir conversación.
   - Tomar conversación como humano.
   - Enviar respuesta humana.
   - Finalizar y devolver al bot.

## Paso A Producción

Solo después de testing OK.

1. Backup productivo nuevo o confirmar que el backup vigente sigue aceptado.

2. En VPS producción actual (`/home/forma/bot_dolce`):
   ```bash
   cd /home/forma/bot_dolce
   git pull --ff-only origin main
   ```

3. Crear/verificar runtime aislado:
   ```bash
   mkdir -p data/asturias logs/asturias
   test -f data/asturias/historial.json || printf '{}' > data/asturias/historial.json
   test -f data/asturias/pausas.json || printf '{}' > data/asturias/pausas.json
   test -f data/asturias/admin-numbers.json || printf '{"admins":["5491158647529","5493513782559"]}\n' > data/asturias/admin-numbers.json
   ```

4. Levantar bot Asturias producción:
   ```bash
   cd /home/forma/bot_dolce
   pm2 start orchestrator.js --name bot-dolce-asturias -- start asturias
   ```

5. Levantar dashboard humano Asturias producción:
   ```bash
   cd /home/forma/bot_dolce
   bash scripts/start-dashboard-asturias.sh
   ```

6. Escanear QR:
   ```bash
   pm2 logs bot-dolce-asturias
   ```

7. Verificar:
   ```bash
   curl http://127.0.0.1:3012/status
   curl -o /dev/null -s -w "%{http_code}\n" http://127.0.0.1:3002/index.html
   pm2 status bot-dolce-asturias dashboard-humano-asturias
   ```

8. Guardar PM2 si todo queda OK:
   ```bash
   pm2 save
   ```

## Rollback

Si falla antes de operar comercialmente:

```bash
pm2 stop bot-dolce-asturias
pm2 stop dashboard-humano-asturias
```

No borrar `data/asturias/` ni `.wwebjs_auth/` sin backup y confirmación.

## Criterios De Aceptación

- `pm2 status` muestra Asturias online.
- `/status` responde `agentId: asturias`, `isRunning: true`.
- WhatsApp muestra `connected`.
- Dashboard `3002` responde `200`.
- Mensaje de prueba responde desde bot.
- Dashboard humano permite tomar y finalizar conversación.
- Santa Ana sigue online en `3011` y `3001`.
- Maestro muestra Asturias con entorno correcto y sin confundirlo con Santa Ana.
