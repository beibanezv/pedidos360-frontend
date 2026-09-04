# AGENTS.md — pedidos360-frontend

## Qué es este repo

Frontend Angular 20 (standalone) + MSAL Angular de **Pedidos360**, e-commerce
ficticio de vinilos y equipos de audio para DSY1107 (DuocUC).
El backend (ms-productos, ms-carrito) vive en sus propios repos; aquí solo frontend.

## Cómo correr

```bash
npm install
npm start        # ng serve → http://localhost:4200
npx ng test      # tests (usa CHROME_BIN o Edge headless si no hay Chrome)
```

## Estado actual

- [x] Scaffold Angular standalone + routing
- [x] Tema portado del mockup (tokens, Fraunces/Space Grotesk/IBM Plex Mono, vinilo hover)
- [x] Wiring MSAL completo: MsalGuard en `/cuenta`/`/carrito`/`/admin`, MsalInterceptor, redirect + PKCE
- [x] Estructura `core/` + `services/`: ProductoService (catálogo real + fallback mock),
      CarritoService (badge con signal), AuthService (claims del access token)
- [x] Home con catálogo desde ms-productos (o fallback mock) y "Agregar" → carrito
- [x] Página `/carrito` protegida e integrada (título/arte del catálogo, checkout)
- [x] Roles en UI: `adminGuard`, `/admin`, navbar condicional, chips de rol en `/cuenta`
- [x] Guías cloud en este repo: `docs/azure-setup.md` (App Registration/scopes/App Roles) y
      `docs/aws-setup.md` + Lambda authorizer en `docs/lambda-authorizer/`
- [ ] **PRÓXIMO PASO**: completar Tenant + App Registration en Azure (pasos de
      `docs/azure-setup.md`) y reemplazar los `TODO-*` en `src/environments/environment.ts`
- [ ] Desplegar API Gateway + EC2 (pasos de `docs/aws-setup.md`) y `useGateway: true`
- [ ] Tag `v1.0.0` recién cuando login + catálogo + carrito funcionen end-to-end

## Decisiones que no romper

- OAuth 2.0/OIDC **Authorization Code + PKCE** únicamente (nunca Implicit).
- Tokens de diseño en `src/styles.css` tal cual están; el efecto firma es el
  vinilo que asoma en las tarjetas de producto — no agregar más decoración.
- Sin UI kits ni librerías de estado: Angular puro + CSS propio.
- El flujo Redirect de MSAL se maneja con `handleRedirectObservable()` en
  `app.ts` (marcado con `// SIMPLIFICADO:`) porque msal-angular no exporta
  `<msal-redirect>` para apps standalone.
- Nunca commitear secretos: clientId/tenant no son secretos, el client secret sí
  (y este frontend SPA ni siquiera debería tener uno).

## Convenciones

- **Ramas**: no trabajar directo en `main`. Una rama corta por tarea
  (`feature/login-azure`, `fix/...`), se fusiona a `main` cuando compila y los
  tests pasan, y se borra. Sin telarañas de ramas: 1–2 activas basta.
- **Commits en español**, lenguaje plano e imperativo: "agrega vista de carrito".
- **Tags `vX.Y.Z`** recién desde la primera versión funcional completa
  (login + catálogo + carrito end-to-end) → `v1.0.0`. Antes: solo commits.
- Tests mínimos siempre verdes antes de pushear.
