# 🏗️ Multi-Tenant WhatsApp Bot Platform

**Versión**: 1.1 (Fase 2 Planificada)  
**Fecha**: 2026-05-17  
**Estado**: Fase 1 local completa; runtime Santa Ana preparado para corte multi-tenant

---

## 📋 Descripción

Sistema multi-tenant para gestionar múltiples clientes de WhatsApp bots desde una única base de código.

**Capacidad actual**: 10-15 clientes  
**Capacidad futura**: 50+ clientes

---

## 📁 Estructura

```
multi-tenant/
├── backups/              # Backups de clientes
├── clients/              # Instancias de clientes
├── config/               # Configuraciones globales
│   ├── client-schema.json      # Schema de validación
│   ├── client-example.json     # Ejemplo de configuración
│   └── port-registry.json      # Registro de puertos
├── dashboard-maestro/    # Dashboard centralizado (Fase 2)
├── scripts/              # Scripts de automatización
│   ├── port-manager.js         # Gestor de puertos
│   └── validate-config.js      # Validador de configs
└── templates/            # Templates base
    └── bot-template/     # Template del bot
```

---

## 🚀 Quick Start

### 1. Deployment en VPS
Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para instrucciones completas.

```bash
# Clonar en VPS
ssh forma@srv1658334.hstgr.cloud
cd /home/forma
# ... (ver DEPLOYMENT.md)
```

### 2. Usar Port Manager
```bash
# Listar puertos
node scripts/port-manager.js list

# Asignar puertos a cliente
node scripts/port-manager.js assign-dashboard mi-cliente
node scripts/port-manager.js assign-bots mi-cliente 2

# Liberar puertos
node scripts/port-manager.js release mi-cliente
```

### 3. Validar Configuración
```bash
node scripts/validate-config.js config/client-example.json
```

---

## 📚 Documentación

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía de deployment en VPS
- **[REVISION_FASE_1.md](./REVISION_FASE_1.md)** - Revisión completa de Fase 1
- **[templates/bot-template/README.md](./templates/bot-template/README.md)** - Documentación del template

---

## 🎯 Fases del Proyecto

### ✅ Fase 1: Foundation (COMPLETA)
- Estructura de directorios
- Template base extraído
- Sistema de configuración
- Gestión de puertos automática

### 🎯 Fase 2: Dashboard Maestro (SIGUIENTE)
- Dashboard centralizado
- Monitoreo interno owner/socio
- Control PM2 con auditoría
- Backups manuales desde dashboard
- Alertas visibles y Telegram como primer canal externo

Ver el plan vigente en:

- `../.gsd/milestones/multi-tenant-architecture/README.md`
- `../.gsd/milestones/multi-tenant-architecture/CURRENT_DECISIONS.md`
- `../.gsd/milestones/multi-tenant-architecture/DASHBOARD_MAESTRO_MVP.md`
- `../.gsd/milestones/multi-tenant-architecture/PHASE_2_PLAN.md`

### ⏳ Fase 3: Scripts de Automatización (PENDIENTE)
- `add-client.sh` - Agregar cliente
- `update-client.sh` - Actualizar cliente
- `backup-client.sh` - Backup de cliente

### ⏳ Fase 4: Dashboards Cliente/Humano (PENDIENTE)
- Dashboard por cliente
- Dashboard humano mejorado
- Control de acceso

### 🔄 Fase 5: Migración (EN PREPARACIÓN)
- Santa Ana preparado para ejecución multi-tenant con `AGENTS_CONFIG_PATH`
- Corte documentado en `clients/dolce-party/CUTOVER_SANTA_ANA.md`
- Migrar ambiente de testing

### ⏳ Fase 6: Documentación Final (PENDIENTE)
- Manual de operador
- Guía de cliente
- Runbooks

---

## 🔧 Comandos Útiles

```bash
# Port Manager
alias mt-ports='node /home/forma/multi-tenant/scripts/port-manager.js'
alias mt-list='mt-ports list'

# Validador
alias mt-validate='node /home/forma/multi-tenant/scripts/validate-config.js'

# Navegación
alias mt-cd='cd /home/forma/multi-tenant'
```

---

## 📊 Estado Actual

| Componente | Estado | Completitud |
|------------|--------|-------------|
| Estructura | ✅ Completo | 100% |
| Template | ✅ Completo | 100% |
| Configuración | ✅ Completo | 100% |
| Port Manager | ✅ Completo | 100% |
| Dashboard Maestro | 🎯 Planificado | 0% |
| Scripts Automatización | ⏳ Pendiente | 0% |

**Fase 1**: ✅ 100% Completa  
**Proyecto Total**: 🔄 Fase 2 lista para comenzar

---

## 🚨 Importante

- ⚠️ NO tocar `/home/forma/bot_dolce` (producción) durante el MVP
- ⚠️ Usar `/home/forma/bot_testing` como entorno de prueba
- ⚠️ Siempre hacer backup antes de cambios importantes
- ⚠️ No migrar JSON a SQLite durante Dashboard Maestro MVP

---

## 📞 Soporte

Para problemas o preguntas:
1. Revisar [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Revisar [REVISION_FASE_1.md](./REVISION_FASE_1.md)
3. Consultar logs: `pm2 logs`

---

**Última actualización**: 2026-05-17  
**Versión**: 1.1 - Fase 2 planificada
