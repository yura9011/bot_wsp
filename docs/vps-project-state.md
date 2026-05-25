# VPS Project State

Snapshot date: 2026-05-25

This document records the current VPS/project state after the architecture refactor was pushed and a first deployment inspection was performed.

## Access

- VPS: `2.24.89.243`
- Hostname observed over SSH: `srv1658334`
- Working SSH user for agent access: `forma`
- SSH key used by this agent: local `~/.ssh/codex_vps_deploy`
- `forma` has sudo group membership, but sudo requires a password.
- Root SSH by this agent is not available.

Do not send passwords in chat. If root access is required, either use provider console/root locally, or add the deploy public key to `/root/.ssh/authorized_keys`.

## Directory Inventory

Main directories under `/home/forma`:

- `/home/forma/bot_wsp`
  - Fresh clone from `https://github.com/yura9011/bot_wsp.git`.
  - Branch: `codex/workspace-physical-cleanup`.
  - Commit: `0075c95 refactor: modularize demo bot architecture`.
  - Created during this session for the refactor deployment attempt.
  - `npm install` was run at repo root and inside `dashboard-humano-v2/`.
  - Because of those installs, `package-lock.json` and `dashboard-humano-v2/package-lock.json` are modified on the VPS clone.
- `/home/forma/bot_testing`
  - Existing repo.
  - Branch: `main`.
  - Remote currently points to `https://github.com/yura9011/bot_dolce.git`.
  - Commit observed: `d19fbb5 Ignore local virtualenv artifacts`.
  - Has existing `.wwebjs_auth`, `data`, `logs`, and `node_modules`.
- `/home/forma/bot_dolce`
  - Existing repo.
  - Branch: `main`.
  - Remote currently points to `https://github.com/yura9011/bot_dolce.git`.
  - Commit observed: `d3844f9 Persist Santa Ana OpenRouter runtime model`.
  - Dirty local runtime/config files observed:
    - `config/admin-numbers.json`
    - `config/phone-map.json`
    - multiple `.env.backup-*` files
    - `config/agents.json.backup*`
    - `dashboard-humano-v2.backup/`
    - `lib/llm.js.backup`
    - `qr.txt`
  - Do not overwrite or normalize this directory without an explicit backup plan.
- `/home/forma/multi-tenant`
  - Existing multi-tenant directory outside the Git repo clones.
  - Contains clients/config/dashboard/scripts/templates.
- `/home/forma/backups`, `/home/forma/backups-prod`, `/home/forma/backups-testing`
  - Existing backup directories.

## Runtime And PM2

Runtime tools observed:

- Node: `v18.20.8`
- npm: `10.8.2`
- PM2: `7.0.1`

PM2 state:

- `PM2_HOME=/home/forma/.pm2` is the PM2 instance available to user `forma`.
- PM2 for `forma` was empty before the deployment attempt.
- `bot-demo-local` and `dashboard-humano-demo-local` were briefly started from `/home/forma/bot_wsp` for verification.
- They were deleted afterward because the demo does not need to keep running right now.
- Final expected state for user `forma`: no PM2 apps running and ports `5010`/`5011` free.

Root PM2:

- A root PM2 daemon was observed earlier at `/root/.pm2`.
- The agent could not inspect root PM2 because sudo requires a password and root SSH is unavailable.
- Do not assume root PM2 is unused.

## Verification Performed On VPS

In `/home/forma/bot_wsp`:

```bash
node --check orchestrator.js
node --check dashboard-humano-v2/server.js
node --check multi-tenant/clients/internal-demo/ecosystem.config.js
node --test lib/runtime-config.test.js lib/conversation-state.test.js lib/admin-number-registry.test.js lib/message-intake.test.js lib/agent-api-routes.test.js dashboard-humano-v2/lib/bot-api-client.test.js
AGENTS_CONFIG_PATH=multi-tenant/clients/internal-demo/agents.json ORCHESTRATOR_START_DASHBOARDS=false node orchestrator.js list
```

Result:

- 34 Node tests passed.
- Syntax checks passed.
- `orchestrator.js list` saw `demo-local` from `multi-tenant/clients/internal-demo/agents.json`.

Deployment smoke performed:

- `PM2_HOME=/home/forma/.pm2 pm2 start multi-tenant/clients/internal-demo/ecosystem.config.js`
- Bot API reached `http://127.0.0.1:5010/status`.
- Bot status was `qr`, waiting for WhatsApp QR scan.
- Dashboard initially failed because dashboard dependencies were not installed.
- `npm install` was then run inside `dashboard-humano-v2/`, dashboard was restarted, and `http://127.0.0.1:5011/api/env` returned `{ "isTesting": false, "agentId": "demo-local" }`.
- Both PM2 apps were then deleted to leave demo stopped.

## Current Deployment Position

The cleanest current deployment candidate is:

```text
/home/forma/bot_wsp
branch: codex/workspace-physical-cleanup
remote: https://github.com/yura9011/bot_wsp.git
```

This is not yet a stable production/demo deployment directory because:

- It was freshly cloned during this session.
- Runtime/session data are new and separate from existing `bot_testing`/`bot_dolce`.
- WhatsApp auth is not connected; bot reached QR state.
- PM2 apps are not saved with `pm2 save`.
- There is no confirmed reverse proxy or public URL mapping for ports `5010`/`5011`.
- Root PM2 and any root-managed deployment remain uninspected.

## Recommended Next Steps

1. Decide which directory is the canonical deployment target:
   - Recommended: promote `/home/forma/bot_wsp` if the goal is a clean deploy of the refactor.
   - Alternative: migrate an existing directory only after backing up runtime data.
2. Decide whether demo runtime should reuse existing WhatsApp/session/data:
   - If yes, explicitly copy or point `.wwebjs_auth`, `data`, and logs from the chosen existing source after backup.
   - If no, scan the new QR from `/home/forma/bot_wsp`.
3. Decide process owner:
   - Recommended: run bot and dashboard under `forma`, not root.
   - If root PM2 is still active for any old deployment, inspect it from provider console/root before switching traffic.
4. Normalize PM2 only after the canonical directory is chosen:
   - `PM2_HOME=/home/forma/.pm2 pm2 start multi-tenant/clients/internal-demo/ecosystem.config.js`
   - verify ports/endpoints
   - `PM2_HOME=/home/forma/.pm2 pm2 save`
5. If `/home/forma/bot_wsp` should remain clean, revert or recommit VPS-only lockfile changes caused by `npm install` before using it as a Git working copy.

## Guardrails

- Do not overwrite `.env`, `.wwebjs_auth`, `.wwebjs_cache`, `data`, `logs`, or backup directories.
- Do not run `pm2 save`, root PM2 commands, deploy hooks, or reverse proxy changes without an explicit go-ahead.
- Treat `/home/forma/bot_dolce` as dirty runtime state, not a clean source checkout.
