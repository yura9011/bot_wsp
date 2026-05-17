# Clients Directory — Future Multi-Tenant Structure

> ⚠️ **ESTRUCTURA FUTURA — NO ACTIVA**
>
> Esta carpeta es un placeholder. El Dashboard Maestro MVP actual lee agentes desde
> `config/agents.json` en la raíz del repo, NO desde aquí.
>
> `agent-registry.js` escanea `multi-tenant/clients/*/agents.json` de forma read-only
> solo si existen, pero durante el MVP esta carpeta está vacía (excepto `.gitkeep`).

## Propósito Futuro

Cuando se active la estructura multi-tenant por cliente, cada cliente tendrá:

```text
multi-tenant/clients/{clientId}/
  ├── client.json       → metadatos del cliente
  ├── agents.json       → agentes del cliente (mismo schema que config/agents.json)
  ├── backups/          → backups generados desde Maestro
  └── audit/            → eventos de auditoría del cliente
```

## Ejemplo Conceptual

Ver `dolce-party.example.json` en este directorio para un ejemplo de cómo se vería
la configuración del primer cliente productivo (`Dolce Party`).

## Reglas

- Los archivos activos deben llamarse `client.json` y `agents.json`.
- Los archivos de ejemplo deben terminar en `.example.json` para evitar que el Maestro los lea.
- No crear config activa aquí hasta que el MVP del Maestro esté completo y aprobado para producción.
