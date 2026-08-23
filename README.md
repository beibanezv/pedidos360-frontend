# pedidos360-frontend

Frontend Angular del e-commerce ficticio **Pedidos360** (vinilos y equipos de audio).
Proyecto académico — DSY1107 Desarrollo Cloud Native I, DuocUC.

## Estado del proyecto

- [x] Scaffold Angular standalone + routing
- [x] Diseño portado del mockup (tokens, tipografías, tarjetas con vinilo)
- [x] Autenticación MSAL cableada (guard, interceptor, redirect + PKCE) — pendiente credenciales reales de Azure
- [x] Home pública con catálogo mockeado
- [ ] Login funcionando (bloqueado por: crear Tenant + App Registration en Azure)
- [ ] Catálogo real desde ms-productos

> Detalle completo y próximo paso: ver `AGENTS.md`.

## Stack

- Angular 20 (componentes standalone) + MSAL Angular (`@azure/msal-angular`)
- Autenticación: Azure AD / Entra ID vía OAuth 2.0 / OIDC — **Authorization Code + PKCE** (flujo Redirect, default de MSAL)
- `MsalGuard` protege rutas privadas; `MsalInterceptor` adjunta el JWT a las llamadas hacia `apiUrl`
- CSS plano con tokens de diseño propios (ver carpeta raíz del curso, `AGENTS.md`)

## Cómo correr

```bash
npm install
npm start        # ng serve en http://localhost:4200
```

## Configuración de Azure AD (pendiente)

Los valores en `src/environments/environment.ts` son **placeholders**. Al crear el
Tenant + App Registration, reemplazar:

| Campo | Dónde se obtiene |
|---|---|
| `clientId` | App Registration → Application (client) ID |
| `authority` | `https://login.microsoftonline.com/<Directory (tenant) ID>` |
| `redirectUri` | Debe estar registrado en el App Registration (SPA platform, tipo `spa`) |
| `apiScopes` | Scopes expuestos por el backend (`api://<clientId>/Productos.Read`, etc.) |

Mientras los placeholders estén sin reemplazar, el login fallará con error de
`clientId` inválido: es lo esperado.

## Rutas

- `/` — home pública (hero + catálogo mockeado hasta que exista ms-productos)
- `/cuenta` — protegida por `MsalGuard`, muestra los claims del token (verificar que lleguen `roles` y `scp`)

## Estructura

```
src/app/
  app.config.ts    providers + wiring MSAL (instance, guard, interceptor)
  app.routes.ts    rutas + MsalGuard
  app.ts/.html     shell: topbar (login/logout), router-outlet, footer
  home/            página pública con grilla de productos mock
  cuenta/          página protegida, inspección de claims del JWT
  data/            catálogo mockeado
```
