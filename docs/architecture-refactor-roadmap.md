# Architecture Refactor Roadmap

This document records the PR1-PR5 architecture refactor completed on `codex/workspace-physical-cleanup`.

## Current Context

- Recommended base branch: `codex/workspace-physical-cleanup`.
- The repository root has been cleaned up.
- `node_modules/` is not installed in the current workspace.
- Sensitive runtime data has been archived under `.private/runtime-archive/2026-05-25/`.
- Do not touch `.private/`, `.env*`, WhatsApp sessions, runtime data, PM2, or deployment.
- Do not add dependencies unless a PR explicitly justifies it.

## Execution Rules

- Work only on `codex/*` branches, one branch per PR.
- Before each PR, run `git status --short --branch` and confirm there are no unrelated changes.
- Keep endpoints, runtime JSON files, and public response shapes unchanged unless the PR explicitly says otherwise.
- Prefer deep modules with a small interface and concentrated behavior.
- Do not extract a module if it would only be pass-through code.

## Completion Summary

Completed modules:

- `lib/conversation-state.js`
- `lib/admin-number-registry.js`
- `dashboard-humano-v2/lib/bot-api-client.js`
- `lib/message-intake.js`
- `lib/agent-api-routes.js`

Behavior kept stable:

- Demo runtime files and public endpoint paths are unchanged.
- Dashboard `/api/chats`, `/api/chats/:userId/messages`, and `/api/admin-numbers` response shapes are unchanged.
- Bot API route response shapes are preserved for status, stats, pause/resume, human send, conversations, logs, and security.
- Demo and order flows remain in `AgentManager`; only intake mechanics and API route mounting were extracted.
- No PM2, deploy, dependency, runtime data, `.env`, WhatsApp session, or `.private/` changes were made.

Later demo behavior update:

- `demo-local` was changed from a store/catalog-style demo to a short capability-responder demo.
- `demo-local` no longer defines `paths.catalog` in the versioned demo config or local fallback config.
- The demo now greets, accepts one capability question, answers through LLM with a demo-scoped system prompt, and then closes.
- The demo now uses the real handoff path for human requests, pricing, complaints, and misunderstanding signals; it pauses AI and surfaces the reason in the dashboard.
- `lib/agent-manager-demo-flow.test.js` covers the demo flow, LLM fallback, real handoff behavior, paused-message history, and old demo-state reset.

## PR 1: Runtime Conversation State Module

Status: completed.

Create `lib/conversation-state.js`.

Purpose:

- Concentrate conversation history, pauses, and chat state calculation.
- Reduce duplication between the bot and the dashboard.

Changes:

- Move `historial.json` and `pausas.json` read/write logic out of `lib/control-manual.js` and `dashboard-humano-v2/server.js`.
- Expose high-level functions for:
  - loading history;
  - adding a message;
  - loading and saving pauses;
  - pausing and resuming a user;
  - listing chats for the dashboard.
- Make `dashboard-humano-v2/server.js` stop reading JSON files directly for `/api/chats` and `/api/chats/:userId/messages`.
- Keep the existing public interface of `lib/control-manual.js` and delegate persistence to the new module.

Acceptance criteria:

- Same runtime files are used.
- `/api/chats` keeps the same response shape.
- Message response shape is unchanged.
- State mapping is preserved:
  - no pause: `bot`;
  - pause with `handoff_solicitado`: `waiting_human`;
  - pause with `atendido_desde_dashboard`: `active_human`.

Tests:

- Missing history returns `{}`.
- Adding a message creates a conversation.
- Pause with `handoff_solicitado` produces `waiting_human`.
- Pause with `atendido_desde_dashboard` produces `active_human`.
- Chats are sorted by latest timestamp.

## PR 2: Admin Number Registry Module

Status: completed.

Create `lib/admin-number-registry.js`.

Purpose:

- Centralize admin number rules used by the dashboard and WhatsApp commands.

Changes:

- Move loading from `admin-numbers.json`, fallback from `ADMIN_NUMBERS`, and fallback from `agents.json`.
- Centralize allowed role validation: `admin`, `ignorado`.
- Centralize `@lid` resolution through `phone-map.json`.
- Replace duplication in:
  - `dashboard-humano-v2/server.js`;
  - `lib/admin-commands.js`.

Acceptance criteria:

- `/api/admin-numbers` keeps the current response shape.
- WhatsApp admin commands keep working.
- The admin numbers file watcher remains or is replaced with an equivalent alternative.

Tests:

- Empty list.
- Environment/config fallback.
- Duplicate create.
- Invalid role.
- Update/delete.
- Resolution with `phone-map.json`.

## PR 3: Dashboard Bot Adapter Module

Status: completed.

Create `dashboard-humano-v2/lib/bot-api-client.js`.

Purpose:

- Keep dashboard routes from knowing HTTP transport details for the bot API.

Changes:

- Move `getBotApiPort` and `callBotApi`.
- Expose intentional operations:
  - send a human message;
  - take a conversation;
  - return a conversation to the bot;
  - finish a conversation.
- Replace direct calls in these routes:
  - `/api/chats/:userId/message`;
  - `/api/chats/:userId/take`;
  - `/api/chats/:userId/resume`;
  - `/api/chats/:userId/finish`.

Acceptance criteria:

- Dashboard public endpoints are unchanged.
- Visible error codes are unchanged.
- Bot errors are normalized with a useful message.

Tests:

- URL is built from agent config.
- Send operation uses `/message/sendMessage/:agentId`.
- Take operation uses `/pause/:userId`.
- Resume operation uses `/resume/:userId`.
- Finish sends `MUCHAS GRACIAS` and then resumes.

## PR 4: AgentManager Message Intake Split

Status: completed.

Create `lib/message-intake.js`.

Purpose:

- Reduce `AgentManager.handleIncomingMessage` complexity without touching business flows.

Changes:

- Extract filters and normalization:
  - ignore groups;
  - ignore status messages;
  - ignore unsupported WhatsApp message types;
  - handle unsupported media;
  - handle empty text;
  - debounce;
  - map `@lid` through the phone map when a contact number is available.
- Keep these responsibilities in `AgentManager`:
  - WhatsApp lifecycle;
  - admin commands;
  - `handleDemoFlow`;
  - `handlePedidoFlow`.

Acceptance criteria:

- `handleIncomingMessage` becomes a coordinator.
- Response copy is unchanged.
- Demo and order flow logic are unchanged.

Tests:

- Ignores group/status messages.
- Ignores invalid types.
- Responds correctly for image, video, document, location, and sticker.
- Debounce blocks rapid messages.
- Maps `@lid` when a contact has a number.

## PR 5: Bot API Routes Module

Status: completed.

Create `lib/agent-api-routes.js`.

Purpose:

- Move Express route mounting out of `AgentManager` after previous modules concentrate state and rules.

Changes:

- Move `initializeAPI` into a dedicated module.
- The module receives explicit capabilities:
  - agent id/name;
  - WhatsApp status;
  - stats manager;
  - conversation state/control manager;
  - WhatsApp client;
  - log paths;
  - logger.
- Keep current paths:
  - `/status`;
  - `/stats`;
  - `/paused`;
  - `/pause/:userId`;
  - `/resume/:userId`;
  - `/pause-global`;
  - `/resume-global`;
  - `/message/sendMessage/:sessionId`;
  - `/chat/fetchMessages/:sessionId`;
  - `/conversations`;
  - `/logs`;
  - `/security`.

Acceptance criteria:

- `AgentManager` no longer defines routes inline.
- Response shapes are identical.
- No changes to ports or PM2.

Tests:

- Status.
- Pause/resume user.
- Pause/resume global.
- Send human message.
- Conversations from history.
- Logs and security when files exist and when they do not exist.

## Verification Performed

Final local verification:

```bash
node --check orchestrator.js
node --check dashboard-humano-v2/server.js
node --check multi-tenant/clients/internal-demo/ecosystem.config.js
node --test lib/runtime-config.test.js lib/conversation-state.test.js lib/admin-number-registry.test.js lib/message-intake.test.js lib/agent-api-routes.test.js dashboard-humano-v2/lib/bot-api-client.test.js
git diff --check
```

Result:

- 34 Node tests passed for the architecture refactor.
- After the handoff polish update, the focused suite passed with 49 Node tests.
- Syntax checks passed.
- `git diff --check` passed.

Runtime smoke not performed:

```bash
AGENTS_CONFIG_PATH=multi-tenant/clients/internal-demo/agents.json ORCHESTRATOR_START_DASHBOARDS=false node orchestrator.js list
```

Reason: `node_modules/` is not installed, and dependencies were intentionally not installed during finalization.
