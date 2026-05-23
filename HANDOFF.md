# Handoff

## Estado Actual

El foco del repo es la demo comercial `demo-local`.

Objetivo inmediato:

- Bot demo activo.
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

## Proximo Trabajo

Pulir la experiencia de dashboard humano demo:

- handoff claro;
- estados de conversacion;
- respuesta humana ergonomica;
- flujo de demo comercial estable;
- copy neutral orientado a venta del producto.
