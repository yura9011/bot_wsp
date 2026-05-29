# Handoff

## Estado Actual

El foco del repo es la demo comercial `demo-local`.

Objetivo inmediato:

- Bot demo activo como respondedor de capacidades, no como tienda/catalogo.
- Dashboard humano demo activo como proceso separado.
- Repositorio publico sin datos personales, runtime data, rutas reales ni documentacion privada.

## Config Activa

Fuente demo:

```text
multi-tenant/clients/internal-demo/agents.json
```

Runtime esperado:

- API bot: `5010`
- Dashboard humano: `5011`
- PM2 bot: `bot-demo-local`
- PM2 dashboard: `dashboard-humano-demo-local`

## Comportamiento Demo Actual

`demo-local` esta configurado como una demo corta de agente respondedor:

- No carga `paths.catalog` y no busca productos.
- Primer mensaje: presenta la demo y pide una consulta sobre capacidades.
- Segunda interaccion: responde una sola consulta usando LLM con prompt acotado a capacidades de la plataforma.
- Si el usuario pide hablar con una persona o aparece precio, reclamo o falta de entendimiento, pausa la IA y lo muestra como handoff en el panel humano.
- Despues de responder, marca la demo como finalizada y contesta solo un cierre comercial breve.
- Las respuestas anti-hijacking son neutrales y no mencionan tienda, cotillon, productos ni pedidos.

## Verificacion Local

```bash
node --check orchestrator.js
node --check dashboard-humano-v2/server.js
node --check multi-tenant/clients/internal-demo/ecosystem.config.js
AGENTS_CONFIG_PATH=multi-tenant/clients/internal-demo/agents.json ORCHESTRATOR_START_DASHBOARDS=false node orchestrator.js list
```

## Reglas Operativas

- No commitear `.env`, sesiones de WhatsApp, logs ni `data/`.
- No publicar telefonos, IPs, hosts, rutas absolutas de servidor ni notas privadas.
- Mantener docs personales en `.private/`, fuera de Git.
- Probar cambios de bot/dashboard en demo antes de pensar en un entorno real.

## Verificacion Reciente

Ultima verificacion local del cambio de demo respondedor:

```bash
node --check orchestrator.js
node --check dashboard-humano-v2/server.js
node --check multi-tenant/clients/internal-demo/ecosystem.config.js
node --test lib/handoff-intent.test.js lib/runtime-config.test.js lib/conversation-state.test.js lib/admin-number-registry.test.js lib/message-intake.test.js lib/agent-api-routes.test.js dashboard-humano-v2/lib/bot-api-client.test.js lib/agent-manager-demo-flow.test.js
git diff --check
```

Resultado: 49 tests pasaron y los checks de sintaxis pasaron.

`AGENTS_CONFIG_PATH=multi-tenant/clients/internal-demo/agents.json ORCHESTRATOR_START_DASHBOARDS=false node orchestrator.js list` no pudo ejecutarse en esta copia porque `node_modules/` no esta instalado y falta `dotenv`.

## Proximo Trabajo

Pulir y probar la experiencia comercial del demo respondedor:

- validar el copy real por WhatsApp con una consulta de cliente;
- ajustar el prompt demo si responde demasiado amplio o demasiado tecnico;
- validar que el dashboard muestre con claridad motivo, estado y nuevo handoff;
- mantener el dashboard humano como proceso separado para observar conversaciones y pruebas internas.
