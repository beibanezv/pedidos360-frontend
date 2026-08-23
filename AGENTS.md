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
- [x] Wiring MSAL completo: MsalGuard en `/cuenta`, MsalInterceptor, redirect + PKCE
- [x] Home pública con catálogo mockeado (`src/app/data/productos.mock.ts`)
- [ ] **PRÓXIMO PASO**: crear Tenant + App Registration en Azure y reemplazar los
      `TODO-*` en `src/environments/environment.ts` → login real funcionando
- [ ] Conectar catálogo real cuando exista ms-productos (cambiar mock por HttpClient)

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

- **Commits en español**, lenguaje plano e imperativo: "agrega vista de carrito".
- **Tags `vX.Y.Z`** recién desde la primera versión funcional completa
  (login + catálogo + carrito end-to-end) → `v1.0.0`. Antes: solo commits.
- Tests mínimos siempre verdes antes de pushear.
