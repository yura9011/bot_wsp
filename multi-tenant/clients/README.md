# Clients Directory — Dashboard Maestro Multi-Tenant Sources

> **ACTIVA SOLO PARA DASHBOARD MAESTRO**
>
> El runtime del bot puede leer esta carpeta cuando se configura
> `AGENTS_CONFIG_PATH=/home/forma/multi-tenant/clients/{clientId}/agents.json`.
> El Dashboard Maestro puede leerla cuando se configura `DASHBOARD_MAESTRO_AGENT_SOURCE_MODE=clients`.
>
> El modo default del Maestro sigue siendo `root`, por compatibilidad.

## Propósito

Cada cliente tiene:

```text
multi-tenant/clients/{clientId}/
  ├── client.json       → metadatos del cliente
  └── agents.json       → agentes del cliente observados por Maestro
```

## Fuentes Activas

- `dolce-party/`: Santa Ana producción, Asturias pendiente de QR y runbook de corte runtime.
- `internal-demo/`: demo-local para testing y controles seguros.

Los archivos `.example.json` siguen siendo ejemplos y no son leídos por el Maestro.

## Reglas

- Los archivos activos deben llamarse `client.json` y `agents.json`.
- Los archivos de ejemplo deben terminar en `.example.json` para evitar que el Maestro los lea.
- No mover ni copiar runtime data productiva a esta carpeta.
- Santa Ana producción se integra por referencia a sus rutas actuales en `/home/forma/bot_dolce`.
- Cualquier control productivo debe seguir bloqueado por `readOnly: true` hasta una decisión explícita.
