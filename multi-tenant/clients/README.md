# Multi-Tenant Clients

Active client configs live here.

Current public config:

- `internal-demo/`: demo tenant used to polish the product experience.

Private or customer-specific configs must stay outside Git, preferably under `.private/`.

Expected shape:

```text
multi-tenant/clients/{clientId}/
  client.json
  agents.json
  ecosystem.config.js
```

Rules:

- Do not commit real phone numbers, customer addresses, server paths, IPs or tokens.
- Do not commit WhatsApp auth, runtime data or logs.
- Prefer relative paths in `agents.json`.
- If a PM2 ecosystem needs server paths, derive them from `__dirname` instead of hardcoding deployment paths.
