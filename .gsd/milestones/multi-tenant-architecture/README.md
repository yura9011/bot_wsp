# Multi-Tenant Architecture

> Current GSD source of truth for the multi-client platform.
> Last updated: 2026-05-17

## Status

The current multi-agent production system stays stable. Multi-tenant work starts as a new app under `multi-tenant/dashboard-maestro/` and is tested in the VPS testing environment before any production replacement.

Dashboard Maestro MVP completed its current testing sprint: persistencia JSON, UI testing, documentación modelo tenant, checklist migración Santa Ana, demo neutral, PM2 control testing validated with `demo-local`, and Santa Ana production read-only visibility.

## Current Documents

Read these first, in order:

1. [CURRENT_DECISIONS.md](./CURRENT_DECISIONS.md) — decisions from the 2026-05-17 interrogation.
2. [DASHBOARD_MAESTRO_MVP.md](./DASHBOARD_MAESTRO_MVP.md) — MVP scope and acceptance criteria.
3. [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) — implementation plan for Dashboard Maestro.
4. [TENANT_MODEL.md](./TENANT_MODEL.md) — tenant model (cliente → agente) for future multi-tenant structure.
5. [SANTA_ANA_MIGRATION_CHECKLIST.md](./SANTA_ANA_MIGRATION_CHECKLIST.md) — phased checklist for integrating Santa Ana production into Maestro read-only.
6. [SANTA_ANA_PRODUCTION_BASELINE.md](./SANTA_ANA_PRODUCTION_BASELINE.md) — read-only baseline of current Santa Ana production dashboard and bot.

## Historical Documents

Older planning documents from 2026-05-10 were archived under:

- [archive/2026-05-10-planning/](./archive/2026-05-10-planning/)

Use them only for background. If they conflict with the current documents, the current documents win.

## Architecture Direction

```text
Cliente -> Agente/Local -> WhatsApp session + data + dashboard humano
```

- The Dashboard Maestro is internal only: owner/admin view for all clients and agents.
- Existing production (`bot_dolce`) remains stable until the new flow is proven.
- Existing testing (`bot_testing`) is the proving ground.
- Runtime data is sacred: do not touch histories, pauses, admin numbers, WhatsApp sessions, stats, logs, or production config without an explicit backup and instruction.
- Santa Ana will be integrated first as read-only, without moving data or changing its runtime paths.
- New clients/agents will be managed by config/script first, then by Maestro.
- Current Santa Ana dashboard humano remains the operational panel at port `3001`; Maestro should reference and monitor it first, not replace it.

## Next Action

Keep Santa Ana production read-only in Maestro. Next step is Fase 1: manual production backup and final route/PM2 registration without modifying production processes.
