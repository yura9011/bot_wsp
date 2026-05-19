# Dashboard Maestro

App interna para monitorear agentes existentes sin reemplazar `dashboard-central.js`.

## Alcance de esta etapa

- Servidor Express + Socket.IO independiente.
- Acceso interno con HTTP Basic Auth.
- UI estática desktop-first.
- Endpoint propio `GET /health`.
- Adapter read-only que lee `config/agents.json` por defecto.
- Fuente multi-tenant activa para Maestro en `multi-tenant/clients/*/agents.json` cuando `DASHBOARD_MAESTRO_AGENT_SOURCE_MODE=clients`.
- Tabla de agentes con id, nombre, enabled, puertos y paths.
- Health collection read-only para bot API y dashboard humano, visible en la tabla.
- Alertas visibles derivadas de health para bot API y dashboard humano caídos.
- Métricas read-only desde `estadisticas.json`: mensajes recibidos/enviados y handoffs.
- Handoffs pendientes read-only desde `pausas.json`, con alerta crítica si superan 10 minutos.
- Estado WhatsApp si el bot API lo expone en `/status`; si no, queda como `unknown`.
- Mute de mantenimiento por agente en memoria.
- Botón "Actualizar ahora".
- Semáforo general, auditoría en memoria, controles PM2 y backup-now server-side deshabilitados por defecto.

No implementa restore desde UI, SQLite ni reemplazo/deploy a producción. Backup-now existe como acción protegida y queda deshabilitada hasta configurar un script explícito de testing.

## Instalación

Desde la raíz del repo ya existen `express` y `socket.io` como dependencias. Si se quiere instalar la app como paquete independiente:

```bash
cd multi-tenant/dashboard-maestro
npm install
```

## Cómo correr

Desde `multi-tenant/dashboard-maestro/`:

```bash
npm start
```

O con puerto custom:

```bash
DASHBOARD_MAESTRO_PORT=3050 npm start
```

En Windows PowerShell:

```powershell
$env:DASHBOARD_MAESTRO_PORT=3050; npm start
```

Default local: `http://localhost:3050`

Credenciales default para local:

- usuario: `admin`
- contraseña: `admin123`

## Endpoints

- `GET /health`: estado del Dashboard Maestro.
- `GET /api/agents`: lectura normalizada de `config/agents.json` con checks HTTP read-only.
- `GET /api/actions/config`: configuración visible de controles PM2.
- `GET /api/audit-events`: últimos eventos de auditoría en memoria.
- `GET /api/backups/config`: configuración visible de backup-now.
- `POST /api/agents/:id/actions`: ejecuta acción PM2 allowlisted si `DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL=true`.
- `POST /api/backups/now`: ejecuta script de backup explícito si `DASHBOARD_MAESTRO_ENABLE_BACKUP_NOW=true`.

Los checks incluyen `status`, `checkedAt`, `lastSuccessfulCheck`, `error` y `lastError`. El último check exitoso se mantiene en memoria mientras el proceso del Maestro esté corriendo. Para dashboards humanos, cualquier respuesta HTTP cuenta como proceso alcanzable; un 404 de ruta raíz no se trata como caída. El estado WhatsApp se lee desde `GET /status` del bot cuando expone `whatsapp.status`.

Las alertas actuales son derivadas de health collection y handoffs pendientes. Telegram queda para etapas posteriores.

Las métricas IA/costo quedan como `Sin datos` hasta instrumentar tokens, llamadas y precios.

## Variables

- `DASHBOARD_MAESTRO_PORT`: puerto HTTP. Default `3050`.
- `DASHBOARD_MAESTRO_USER`: usuario de HTTP Basic Auth. Default `admin`.
- `DASHBOARD_MAESTRO_PASS`: contraseña de HTTP Basic Auth. Default `admin123`.
- `DASHBOARD_MAESTRO_REFRESH_MS`: intervalo de refresh por WebSocket. Default `300000` ms.
- `DASHBOARD_MAESTRO_HEALTH_TIMEOUT_MS`: timeout por check HTTP. Default `2500` ms.
- `DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL`: habilita acciones PM2 reales. Default deshabilitado.
- `DASHBOARD_MAESTRO_PM2_ENV`: sufijo de naming para PM2. Usar `testing` en `bot_testing`.
- `DASHBOARD_MAESTRO_PM2_BIN`: binario PM2. Default `pm2`.
- `DASHBOARD_MAESTRO_PM2_TIMEOUT_MS`: timeout por acción PM2. Default `15000` ms.
- `DASHBOARD_MAESTRO_ENABLE_BACKUP_NOW`: habilita backup-now real. Default deshabilitado.
- `DASHBOARD_MAESTRO_BACKUP_SCRIPT`: script de backup a ejecutar. Debe apuntar a testing, no a producción.
- `DASHBOARD_MAESTRO_BACKUP_TIMEOUT_MS`: timeout de backup-now. Default `120000` ms.
- `AGENTS_CONFIG_PATH`: path alternativo para leer agentes. Default `config/agents.json` del repo.
- `AGENTS_OVERRIDE_PATH`: path alternativo para overrides de puertos y procesos PM2. Default `config/agents.override.json` junto al config.
- `CLIENTS_DIR`: path alternativo para buscar `clients/*/agents.json`. Default `multi-tenant/clients`.
- `DASHBOARD_MAESTRO_AGENT_SOURCE_MODE`: fuente de agentes para Maestro. Valores: `root` (default), `clients`, `merged`.
- `CORS_ORIGIN`: origen permitido para Socket.IO. Default `*`.

## Modo multi-tenant clients

Para validar Santa Ana en la estructura nueva sin cambiar el runtime del bot:

```powershell
$env:DASHBOARD_MAESTRO_AGENT_SOURCE_MODE="clients"; npm start
```

En este modo el Maestro lee `multi-tenant/clients/dolce-party/agents.json` y `multi-tenant/clients/internal-demo/agents.json`.
Santa Ana queda como `readOnly: true`, Asturias como `pending-qr` y demo-local conserva controles de testing.

## Overrides de testing

`config/agents.override.json` permite adaptar testing sin mutar `config/agents.json`. También puede deshabilitar agentes que no estén activos en ese entorno para que no afecten el semáforo general:

```json
{
  "enabledOverrides": {
    "asturias": false
  },
  "portOverrides": {
    "santa-ana": { "api": 4011, "dashboard": 4001 },
    "asturias": { "api": 4012, "dashboard": 4003 }
  },
  "processOverrides": {
    "santa-ana": { "bot": "bot-dolce-dev", "dashboard": "dashboard-humano-testing" },
    "asturias": { "dashboard": "dashboard-humano-asturias" },
    "demo-local": { "bot": "bot-demo-local" }
  }
}
```

## Seguridad

Las acciones PM2 y backup-now están deshabilitadas por defecto. Para testing, habilitarlas explícitamente con `DASHBOARD_MAESTRO_ENABLE_PM2_CONTROL=true`, `DASHBOARD_MAESTRO_PM2_ENV=testing`, `DASHBOARD_MAESTRO_ENABLE_BACKUP_NOW=true` y `DASHBOARD_MAESTRO_BACKUP_SCRIPT=scripts/backup-testing.sh`. Antes de usarlo fuera de local/testing, definir `DASHBOARD_MAESTRO_USER` y `DASHBOARD_MAESTRO_PASS` con credenciales no default.

En el VPS testing, el Maestro corre como PM2 `dashboard-maestro-testing` en puerto interno `4050`. Si el puerto no está expuesto externamente, probar con túnel SSH:

```powershell
ssh -L 4050:127.0.0.1:4050 forma@srv1658334.hstgr.cloud
```

Luego abrir `http://localhost:4050`.

## Verificación

Usar [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) antes de probar en VPS testing o habilitar acciones reales.
