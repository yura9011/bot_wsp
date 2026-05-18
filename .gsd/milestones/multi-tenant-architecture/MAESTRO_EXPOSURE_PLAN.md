# Maestro Exposure Plan

> Plan para exponer Dashboard Maestro sin abrir el puerto `4050` directo.
> Estado: pendiente de dominio/subdominio y decisión de acceso.

## Recomendación

Usar reverse proxy con HTTPS y autenticación. Mantener `dashboard-maestro-testing` escuchando solo en loopback/puerto interno y publicar por proxy.

## Datos Pendientes Del Usuario

- Dominio o subdominio, por ejemplo `maestro.example.com`.
- Lista de personas que deben acceder.
- Definir si MVP usa Basic Auth actual o si se agrega otra capa después.
- Confirmar si el acceso será solo interno o también desde celulares/redes externas.

## Camino Técnico

- [ ] Crear DNS del subdominio hacia el VPS.
- [ ] Configurar Nginx/Caddy como reverse proxy hacia `127.0.0.1:4050`.
- [ ] Activar HTTPS con Let's Encrypt.
- [ ] Mantener Basic Auth del Maestro con password fuerte.
- [ ] No exponer `4050` directo por firewall.
- [ ] Probar `/health`, login y `/api/agents`.
- [ ] Documentar procedimiento de rotación de contraseña.

## Guardrails

- No publicar Maestro sin HTTPS.
- No deshabilitar auth del Maestro.
- No habilitar PM2 control productivo por el hecho de exponer el panel.
- Mantener Santa Ana producción read-only hasta decisión explícita.

## Verificación

- `https://<subdominio>/health` responde OK.
- La UI pide credenciales.
- El panel carga agentes.
- Acciones read-only siguen bloqueadas para `santa-ana-prod`.
- `http://IP:4050` sigue inaccesible externamente.
