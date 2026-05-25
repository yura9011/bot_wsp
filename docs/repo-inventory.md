# Repo Inventory

This document separates the current public demo surface from legacy or internal work.
It is a working map for agents; it does not change runtime behavior.

## Active Demo Surface

- `orchestrator.js` starts and lists configured bot agents.
- `lib/agent-manager.js` owns the WhatsApp client, bot API, pause/resume endpoints, human-message sending, logs, security views, and conversation summaries.
- `lib/agent-config.js` and `lib/runtime-paths.js` load the active agent config and resolve runtime paths.
- `dashboard-humano-v2/` is the current human dashboard. It runs as a separate process and talks to the bot API over localhost.
- `multi-tenant/clients/internal-demo/agents.json` is the versioned demo tenant config for `demo-local`.
- `multi-tenant/clients/internal-demo/ecosystem.config.js` is the demo PM2 definition for separate bot and dashboard processes.
- `catalogs/catalogo-demo.js` is the public demo catalog.

## Compatibility And Fallbacks

- `config/agents.json` mirrors the demo agent shape and is still the default fallback when `AGENTS_CONFIG_PATH` is not set.
- `multi-tenant/config/port-registry.json` reserves platform/client ports, including the future internal maestro port `3000`.
- `multi-tenant/scripts/validate-config.js` and `multi-tenant/scripts/port-manager.js` are shared config tooling, not runtime services.
- `scripts/*.bat` are Windows convenience launchers. They should be checked before use because some names still reflect older workflows.

## Legacy Candidates

- `routes/human-panel.js` is not mounted by the active Express apps. It appears to predate `dashboard-humano-v2/server.js` and uses older handoff assumptions.
- `scripts/start-dashboard-central.bat`, `testing/start-all.js`, and `testing/test-websocket.js` reference `dashboard-central.js`, but no public `dashboard-central.js` exists in the repo.
- `testing/bot-debug.js`, `testing/debug-bot.js`, and `testing/test-catalogo.js` are ad hoc debug scripts. Review paths/imports before relying on them.
- Comments in `lib/agent-manager.js` still mention `dashboard-central`; the active caller is the human dashboard through Bot API endpoints.

## Internal Maestro Direction

- The maestro dashboard is an internal product surface, not trash to delete.
- It should be recovered or rebuilt in its own small PR when there is a clear entrypoint, auth model, and runtime contract.
- Until then, demo-local remains the active public product surface and maestro references should not leak private hostnames, IPs, phone numbers, tokens, runtime data, or personal notes.

## Safety Rules For Cleanup

- Do not edit or normalize `data/`, `logs/`, `.wwebjs_auth/`, `.wwebjs_cache/`, `.env*`, `.private/`, or environment-specific overrides.
- Before deleting or moving a legacy candidate, prove it is unused with `rg` and a runtime check.
- Keep bot, dashboard, and maestro work in separate `codex/*` branches.
