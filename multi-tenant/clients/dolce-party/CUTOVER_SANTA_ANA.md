# Corte Santa Ana a runtime multi-tenant

> Runbook para VPS. No ejecutar sin backup reciente y usuario presente.

## Pre-check

```bash
cd /home/forma/bot_dolce
node --check orchestrator.js
node --check lib/agent-manager.js
node --check lib/agent-config.js
node --check lib/runtime-paths.js
node --check dashboard-humano-v2/server.js

AGENTS_CONFIG_PATH=/home/forma/multi-tenant/clients/dolce-party/agents.json \
ORCHESTRATOR_START_DASHBOARDS=false \
node orchestrator.js list
```

Guardar estado actual:

```bash
pm2 describe bot-dolce-prd > /home/forma/backups-prod/bot-dolce-prd-pre-mt.txt
pm2 describe dashboard-humano-santa-ana > /home/forma/backups-prod/dashboard-humano-santa-ana-pre-mt.txt
```

Crear backup:

```bash
cd /home/forma/bot_dolce
bash scripts/backup-production.sh
```

## Corte

```bash
pm2 stop dashboard-humano-santa-ana
pm2 stop bot-dolce-prd

pm2 start /home/forma/multi-tenant/clients/dolce-party/ecosystem.config.js --only bot-dolce-mt-prd
pm2 start /home/forma/multi-tenant/clients/dolce-party/ecosystem.config.js --only dashboard-humano-santa-ana-mt
```

## Verificación

```bash
pm2 list
curl -s http://127.0.0.1:3011/status
curl -I http://127.0.0.1:3001/index.html
```

Validar manualmente:

- WhatsApp conectado en `/status`.
- Login del dashboard humano.
- Lista de chats visible.
- Envío humano de prueba desde panel.
- Mensaje real de prueba al bot.

Si todo está OK:

```bash
pm2 save
```

## Rollback

```bash
pm2 stop dashboard-humano-santa-ana-mt
pm2 stop bot-dolce-mt-prd

pm2 start bot-dolce-prd
pm2 start dashboard-humano-santa-ana
```

Verificar rollback:

```bash
curl -s http://127.0.0.1:3011/status
curl -I http://127.0.0.1:3001/index.html
```
