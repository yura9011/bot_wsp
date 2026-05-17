# Modelo Tenant — Cliente → Agente

> Documenta la relación entre clientes y agentes/locales en el sistema multi-tenant.
> Última actualización: 2026-05-17

## Conceptos

### Cliente

Una entidad comercial que contrata el servicio. Ejemplo: `Dolce Party`.

Campos:
- `id`: identificador único (ej. `dolce-party`)
- `nombre`: nombre comercial (ej. `Dolce Party`)
- `entorno`: `testing` | `production` (cada cliente puede tener agentes en distintos entornos)
- `agentes`: lista de agentes/locales asociados

### Agente / Local

Un número de WhatsApp operativo. Ejemplo: `Santa Ana`, `Asturias`.

Campos:
- `id`: identificador único dentro del cliente (ej. `santa-ana`)
- `clientId`: id del cliente al que pertenece
- `nombre`: nombre descriptivo
- `paths`: directorios runtime (`data/`, `logs/`, `catalog`)
- `ports`: puertos API y dashboard humano
- `pm2`: nombres de procesos PM2 para bot y dashboard
- `enabled`: si el agente está activo
- `entorno`: `testing` | `production`

### Relación

```text
Cliente (1)
  └── Agente/local (N)
        ├── WhatsApp session
        ├── Runtime data (historial, pausas, admin-numbers)
        ├── Bot API (Express)
        └── Dashboard humano (Express + Socket.IO)
```

## Ejemplo: Dolce Party

```json
{
  "clientId": "dolce-party",
  "nombre": "Dolce Party",
  "entorno": "production",
  "agentes": [
    {
      "id": "santa-ana",
      "nombre": "Dolce Party - Santa Ana",
      "enabled": true,
      "entorno": "production",
      "whatsapp": "0351 855-9145",
      "puertos": { "api": 3011, "dashboard": 3001 },
      "paths": {
        "data": "data/santa-ana",
        "logs": "logs/santa-ana",
        "catalog": "catalogs/catalogo-santa-ana.js"
      },
      "pm2": {
        "bot": "bot-dolce-prd",
        "dashboard": "dashboard-humano-v2"
      }
    },
    {
      "id": "asturias",
      "nombre": "Dolce Party - Asturias",
      "enabled": false,
      "entorno": "testing",
      "whatsapp": "0351 855-0000",
      "puertos": { "api": 4012, "dashboard": 4003 },
      "paths": {
        "data": "data/asturias",
        "logs": "logs/asturias",
        "catalog": "catalogs/catalogo-santa-ana.js"
      }
    },
    {
      "id": "demo-local",
      "nombre": "Demo - Nuevos Clientes",
      "enabled": true,
      "entorno": "testing",
      "whatsapp": "11 7145-8944",
      "puertos": { "api": 5010, "dashboard": 5011 },
      "paths": {
        "data": "data/demo-local",
        "logs": "logs/demo-local",
        "catalog": "catalogs/catalogo-demo.js"
      },
      "pm2": {
        "bot": "bot-demo-local"
      }
    }
  ]
}
```

## Principios de Integración de Santa Ana

Santa Ana es el agente productivo actual. No se migra moviendo archivos ni modificando su runtime. El proceso es:

1. **Registro read-only**: el Maestro lista Santa Ana leyendo `config/agents.json` sin modificar nada.
2. **Health checks**: el Maestro consulta el bot API y dashboard humano de Santa Ana en sus puertos actuales.
3. **Métricas**: el Maestro lee `data/santa-ana/estadisticas.json` sin escribir.
4. **PM2 control**: deshabilitado inicialmente. Solo se habilita después de probar en testing y validar nombres PM2 reales.

No se mueve `data/santa-ana/` ni se cambian sus rutas. La integración es por referencia, no por copia.

## Migración Futura

Cuando un nuevo cliente se incorpora al sistema multi-tenant, su configuración vivirá en:

```text
multi-tenant/clients/{clientId}/
  ├── client.json       → datos del cliente
  └── agents.json       → agentes del cliente
```

Esta estructura es **futura** y no está activa. Durante el MVP, el Maestro lee desde `config/agents.json`.
