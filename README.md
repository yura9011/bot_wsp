# WhatsApp Automation Demo

Demo comercial de una plataforma de atencion por WhatsApp con bot respondedor, handoff humano configurable y dashboard operativo.

El repo esta enfocado en un entorno demo (`demo-local`) para iterar producto sin publicar datos de clientes, rutas de servidores ni runtime data real.

El demo activo ya no simula una tienda ni usa catalogo. `demo-local` muestra una experiencia acotada de agente respondedor: saluda, acepta una consulta sobre capacidades de la plataforma, responde con LLM bajo un prompt limitado y deriva a humano cuando detecta intencion de atencion humana, precio, reclamo o falta de entendimiento.

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

## Prueba De Handoff

Flujo esperado para validar la promesa comercial:

1. Enviar `hola` por WhatsApp al bot demo.
2. Enviar una frase de handoff: `quiero hablar con una persona`, `necesito precio`, `tengo un reclamo` o `no me entendiste`.
3. El bot debe responder que pasa la conversacion a una persona, pausar la IA y mostrar el motivo en el panel humano.
4. En el dashboard, tomar la conversacion y responder desde el panel.
5. Mientras el chat esta en `Atencion humana`, los mensajes nuevos del cliente deben aparecer en historial y no deben recibir respuesta automatica.
6. Solo al usar `Devolver al bot` o finalizar la conversacion, la IA vuelve a responder.

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
