# Multi-Tenant Architecture

> Current GSD source of truth for the multi-client platform.
> Last updated: 2026-05-19

## Status

The current multi-agent production system stays stable. Multi-tenant work starts as a new app under `multi-tenant/dashboard-maestro/` and is tested in the VPS testing environment before any production replacement.

Dashboard Maestro MVP completed its current testing sprint: persistencia JSON, UI testing, documentación modelo tenant, checklist migración Santa Ana, demo neutral, PM2 control testing validated with `demo-local`, and Santa Ana production read-only visibility.

Santa Ana now has a Dashboard Maestro multi-tenant source under `multi-tenant/clients/dolce-party/`, activated only when `DASHBOARD_MAESTRO_AGENT_SOURCE_MODE=clients`. The bot runtime still reads `config/agents.json`.

## Current Documents

Read these first, in order:

1. [CURRENT_DECISIONS.md](./CURRENT_DECISIONS.md) — decisions from the 2026-05-17 interrogation.
2. [DASHBOARD_MAESTRO_MVP.md](./DASHBOARD_MAESTRO_MVP.md) — MVP scope and acceptance criteria.
3. [PHASE_2_PLAN.md](./PHASE_2_PLAN.md) — implementation plan for Dashboard Maestro.
4. [TENANT_MODEL.md](./TENANT_MODEL.md) — tenant model (cliente → agente) for future multi-tenant structure.
5. [SANTA_ANA_MIGRATION_CHECKLIST.md](./SANTA_ANA_MIGRATION_CHECKLIST.md) — phased checklist for integrating Santa Ana production into Maestro read-only.
6. [SANTA_ANA_PRODUCTION_BASELINE.md](./SANTA_ANA_PRODUCTION_BASELINE.md) — read-only baseline of current Santa Ana production dashboard and bot.
7. [ASTURIAS_ONBOARDING_RUNBOOK.md](./ASTURIAS_ONBOARDING_RUNBOOK.md) — operational checklist for the pending Asturias QR/onboarding.
8. [AGENT_ONBOARDING_CHECKLIST.md](./AGENT_ONBOARDING_CHECKLIST.md) — reusable checklist for future agents/clients.
9. [MAESTRO_EXPOSURE_PLAN.md](./MAESTRO_EXPOSURE_PLAN.md) — HTTPS/reverse-proxy plan before exposing Maestro externally.
10. [HUMAN_DASHBOARD_BASELINE.md](./HUMAN_DASHBOARD_BASELINE.md) — tested behavior and handoff gap for the current human dashboard.

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
- Santa Ana is integrated first as read-only in the Maestro client source, without moving data or changing its runtime paths.
- New clients/agents will be managed by config/script first, then by Maestro.
- Current Santa Ana dashboard humano remains the operational panel at port `3001`; Maestro should reference and monitor it first, not replace it.

## Next Action

Validate `DASHBOARD_MAESTRO_AGENT_SOURCE_MODE=clients` in testing by tunnel. Keep Santa Ana production read-only in Maestro. Asturias is pending QR/onboarding; follow `ASTURIAS_ONBOARDING_RUNBOOK.md` when the phone is available. Maestro exposure needs domain/subdomain before implementation.
