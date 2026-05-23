# AGENTS.md

Operating rules for coding agents working on this repository.

## Project Context

This is a WhatsApp automation platform with a demo-first runtime. The active product surface is `demo-local`: a bot API plus a separate human dashboard.

The repository should remain safe to view publicly. Do not commit private notes, production paths, server hostnames, IP addresses, personal phone numbers, tokens, WhatsApp sessions, logs, or runtime data.

## Source Of Truth

Read in this order:

1. `README.md`
2. `HANDOFF.md`
3. `AGENTS.md`
4. The code and config directly involved in the task

If documents conflict, prefer the newest explicit user request and the local code that is actually running.

## Protected Runtime Data

Never overwrite, normalize, delete, move, or regenerate runtime data unless the user explicitly asks and a backup exists.

Protected runtime package:

- `data/**`
- `logs/**`
- `.wwebjs_auth/**`
- `.wwebjs_cache/**`
- `.env`
- environment-specific config overrides

## Current Product Direction

Build and polish the demo product first:

- `multi-tenant/clients/internal-demo/agents.json` is the versioned demo tenant config.
- `dashboard-humano-v2/` is the current human dashboard.
- `orchestrator.js` runs the bot API.
- Bot and dashboard should run as separate PM2 processes in shared environments.

## Engineering Rules

- Keep work scoped to the requested behavior.
- Prefer existing Express, Socket.IO, vanilla JS/CSS and JSON patterns.
- Do not add dependencies unless necessary.
- Read immediate callers and existing helpers before editing shared code.
- Avoid unrelated cleanup inside feature work.
- Use `rg` for searches.
- Use `apply_patch` for manual code edits.

## Git Rules

- Keep commits focused and atomic.
- Do not commit runtime data or private docs.
- Use `main` as stable baseline, `staging` for integration, and `codex/*` for focused work.
- Do not deploy or run PM2 lifecycle commands unless the user explicitly asks.

## Verification

For runtime/config changes, run the narrowest useful checks:

```bash
node --check orchestrator.js
node --check dashboard-humano-v2/server.js
AGENTS_CONFIG_PATH=multi-tenant/clients/internal-demo/agents.json ORCHESTRATOR_START_DASHBOARDS=false node orchestrator.js list
```

For dashboard changes, also smoke the relevant local or demo URL and verify the UI manually.
