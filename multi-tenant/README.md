# Multi-Tenant Runtime

This folder contains the demo tenant configuration and shared multi-tenant tooling.

## Current Focus

The only active public tenant is:

- `clients/internal-demo/`

It is used for commercial walkthroughs and product iteration.

## Runtime Model

Each tenant may provide:

```text
client.json            Client metadata
agents.json            Bot/dashboard agent config
ecosystem.config.js    PM2 process definitions
```

The demo PM2 ecosystem runs bot and dashboard as separate processes:

- `bot-demo-local`
- `dashboard-humano-demo-local`

## Safety Rules

- Keep customer-specific configs private.
- Keep deployment-specific paths and hosts out of versioned files.
- Keep runtime data, WhatsApp sessions and logs out of Git.
- Use `AGENTS_CONFIG_PATH` to point a runtime at the desired tenant config.

## Local Check

```bash
AGENTS_CONFIG_PATH=multi-tenant/clients/internal-demo/agents.json \
ORCHESTRATOR_START_DASHBOARDS=false \
node orchestrator.js list
```
