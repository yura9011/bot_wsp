# Legacy Surfaces

This folder contains public, versioned code that is not part of the active
`demo-local` runtime.

Keep legacy code here until it is either recovered as an active product surface
or deleted in a focused cleanup PR.

Current contents:

- `routes/human-panel.js`: older human-panel API route, not mounted by the active apps.
- `scripts/start-dashboard-central.bat`: launcher for a missing `dashboard-central.js` entrypoint.
- `testing/`: ad hoc debug and historical smoke scripts that need review before use.
