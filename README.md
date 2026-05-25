# WhatsApp Automation Demo

Demo comercial de una plataforma de atencion por WhatsApp con bot, handoff humano y dashboard operativo.

El repo esta enfocado en un entorno demo (`demo-local`) para iterar producto sin publicar datos de clientes, rutas de servidores ni runtime data real.

## Requisitos

- Node.js 18+
- npm
- PM2 para despliegues persistentes
- Una clave LLM configurada por entorno

## Configuracion Local

```bash
npm install
cp .env.example .env
```

Edita `.env` con tus claves y valores locales.

## Demo

```bash
AGENTS_CONFIG_PATH=multi-tenant/clients/internal-demo/agents.json \
ORCHESTRATOR_START_DASHBOARDS=false \
node orchestrator.js list
```

Para iniciar el bot demo:

```bash
AGENTS_CONFIG_PATH=multi-tenant/clients/internal-demo/agents.json \
ORCHESTRATOR_START_DASHBOARDS=false \
node orchestrator.js start demo-local
```

El dashboard humano se ejecuta como proceso separado:

```bash
cd dashboard-humano-v2
AGENTS_CONFIG_PATH=../multi-tenant/clients/internal-demo/agents.json \
DASHBOARD_AGENT_ID=demo-local \
CONFIG_AGENT_ID=demo-local \
DASHBOARD_HUMANO_PORT=5011 \
node server.js
```

## Estructura Principal

```text
orchestrator.js                  Runtime multi-agente
lib/                             Bot, LLM, seguridad y runtime helpers
dashboard-humano-v2/             Panel humano operativo
multi-tenant/clients/internal-demo/
                                 Config demo versionada
config/agents.json               Config local demo-only
catalogs/                        Catalogos de ejemplo
legacy/                          Superficies historicas fuera del runtime activo
```

## Datos Y Secretos

No se versionan sesiones, historiales, pausas, telefonos reales, tokens ni configuraciones privadas.

Archivos generados o privados quedan fuera de Git:

- `.env`
- `.wwebjs_auth/`
- `.wwebjs_cache/`
- `data/`
- `logs/`
- `.private/`

## Flujo De Trabajo

- `main`: baseline estable y publicable.
- `staging`: integracion.
- `codex/*`: ramas chicas para mejoras puntuales.

Los cambios de runtime productivo se hacen con ventana explicita y backup previo.
