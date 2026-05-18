# Agent Onboarding Checklist

> Checklist reusable para altas de nuevos agentes/locales.
> No reemplaza el runbook específico de Asturias; lo generaliza.

## Datos Necesarios

- Cliente: nombre comercial y `clientId`.
- Agente/local: `id`, nombre visible, teléfono WhatsApp normalizado.
- Dirección y horarios.
- Catálogo: compartido o archivo propio.
- Usuarios dashboard: usuario, nombre, rol.
- Admin WhatsApp: números autorizados.
- Puertos: API y dashboard.
- PM2 names: bot y dashboard.
- Entorno inicial: testing o producción directa.

## Preconfiguración

- [ ] Agregar o actualizar entrada en `config/agents.json`.
- [ ] Confirmar que `paths.data`, `paths.logs` y `paths.catalog` no pisan otro agente.
- [ ] Confirmar que los puertos no están en uso.
- [ ] Confirmar que el catálogo existe.
- [ ] Dejar el agente como `pending-qr` en Maestro si el WhatsApp todavía no fue escaneado.
- [ ] Quitar `pending-qr` solo cuando el QR haya sido escaneado y `/status` responda `isRunning=true`.
- [ ] Usar estados claros en Maestro: `pending-qr`, `active`, `disabled`, `read-only`.
- [ ] Crear runbook específico si el alta no sigue el camino estándar.

## Alta Técnica

- [ ] Backup vigente antes de tocar producción.
- [ ] Crear runtime aislado: `data/{agentId}` y `logs/{agentId}`.
- [ ] Inicializar `historial.json`, `pausas.json` y `admin-numbers.json` sin copiar datos de otro agente.
- [ ] Levantar PM2 bot con nombre propio.
- [ ] Levantar dashboard humano con nombre propio si no corre como hijo del bot.
- [ ] Escanear QR.
- [ ] Validar `/status`.
- [ ] Validar dashboard humano.
- [ ] Validar handoff formal: tomar conversación, enviar como humano, devolver al bot.
- [ ] Validar mensaje de prueba.
- [ ] Guardar PM2 si corresponde.

## Guardrails

- No mover ni reutilizar `.wwebjs_auth` de otro agente.
- No copiar `historial.json` ni `pausas.json` entre agentes.
- No habilitar acciones PM2 productivas desde Maestro hasta que testing/control esté validado.
- No abrir exposición externa sin HTTPS y auth.

## Criterios De Aceptación

- Bot API responde `isRunning=true`.
- WhatsApp figura `connected`.
- Dashboard responde HTTP `200`.
- Mensaje de prueba responde con datos del agente correcto.
- Dashboard humano puede tomar/finalizar conversación.
- Maestro muestra entorno y estado correctos.
- Agentes existentes siguen online.
