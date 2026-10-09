# pedidos360-frontend

Frontend Angular del e-commerce ficticio **Pedidos360** (vinilos y equipos de audio).
Proyecto académico — DSY1107 Desarrollo Cloud Native I, DuocUC.

Los repositorios publican con tag. Este README se reescribió al terminar la
segunda vía de login.

## Stack

- Angular 20 (componentes standalone) + MSAL Angular (`@azure/msal-angular`)
- Autenticación primaria: **Azure AD / Entra ID**, OAuth 2.0 / OIDC con
  **Authorization Code + PKCE** (flujo Redirect)
- Segunda vía de login: **AWS Cognito** con su propio PKCE (`core/security/`)
- `MsalInterceptor` adjunta el JWT de Azure a las llamadas al API; cuando Azure no
  pone token, el interceptor de Cognito adjunta el suyo
- CSS plano con los tokens de diseño de `AGENTS.md` (Fraunces, Space Grotesk,
  IBM Plex Mono; paleta ink/panel/copper). Sin UI kits ni librerías de estado.

## Autenticación: dos vías, una sesión

La app soporta iniciar sesión por Azure AD (primera, y la que sostiene la
evaluación 1) o por Cognito. Las rutas protegidas usan `sesionGuard`, que
acepta cualquiera de las dos vías; si no hay sesión, redirige a `/login`.

- `sesionGuard` (`core/security/sesion.guard.ts`): deja pasar si hay cuenta MSAL
  activa o si la sesión de Cognito existe. No es `MsalGuard`, porque ese fuerza
  el redirect a Azure y rompería la segunda vía de login.
- `MsalGuard` sigue instanciado en `app.config.ts` (lo registra `MsalModule`)
  pero no se colgó a ninguna ruta por el motivo anterior.
- El interceptor de Cognito solo agrega token si la petición no trae uno; si hay
  cuenta MSAL, siempre gana el token de Azure.
- `/admin` además exige `adminGuard`, que mira los roles de Azure.

## Rutas

| Ruta | Vista | Protegida por |
|---|---|---|
| `/` | home pública con hero y grilla de productos | — |
| `/catalogo` | catálogo real desde ms-productos | — |
| `/login` | pantalla de acceso | — |
| `/cognito/callback` | canje del código de Cognito | — |
| `/cuenta` | claims del token y tabla servida por ms-login | `sesionGuard` |
| `/carrito` | carrito, checkout y mensaje de orden | `sesionGuard` |
| `/ordenes` | historial de compras (`/ordenes` del Gateway) | `sesionGuard` |
| `/admin` | administración de productos | `sesionGuard` + `adminGuard` |

## Endpoints y entornos

`src/environments/` tiene dos perfiles: el de desarrollo habla directo a los
puertos locales de los microservicios (`localhost:8081`–`8088`) y el de
producción pasa por el API Gateway (`useGateway: true`).

Los identificadores (clientId, tenant, userPoolId, dominio) **no son secretos**
y se commitean. Lo que cambia por entorno va en variables de entorno, nunca en
el repositorio.

## Cómo correrlo

```bash
npm install
ng serve            # http://localhost:4200
ng test             # 10 pruebas unitarias
ng build            # producción, con el baseHref que toque según el entorno
```

Para que las vistas protegidas lleguen a los servicios de fondo, hay que tener
levantados los microservicios (puertos 8081–8088) o apuntar `apiUrl` al Gateway.

## Registro de Lambda authorizer

El authorizer JWT nativo del Gateway solo acepta un emisor, así que hacer
convivir Azure con Cognito exige una Lambda. Esa Lambda vive en su propio
repositorio, `pedidos360-lambda-authorizer`, que documenta la decisión completa.

## Evidencias

Las capturas de los flujos quedan en `docs/evidencias/`:

- `fase1/` — login con Azure, API Manager rechazando y aceptando tokens, y las
  instancias corriendo en AWS (matriz 401/403/200).
- `fase5/` — catálogo real, carrito, checkout con orden registrada y `/ordenes`,
  contra los servicios locales.
- `fase6/` — frontend desplegado en el API Gateway y las primeras pruebas del
  checkout en la nube.

Los detalles de lo que falta o se rompió quedan en `PENDIENTES.md`, que manda
sobre este README cuando difieren.
