# Pendientes Pedidos360 — Cumplimiento de Evaluación

Análisis cruzado entre los requerimientos (`Enunciado_Evaluacion_1.md`, `EP1_DSY1107_Estudiante_encargo.md`) y el estado actual del proyecto.

---

## Lo que ya está listo

| Requerimiento | Estado | Detalle |
|---|---|---|
| Frontend Angular standalone | ✅ | Angular 20, componentes standalone, sin módulos |
| MSAL Angular (código) | ✅ | `PublicClientApplication`, `MsalGuard`, `MsalInterceptor`, redirect handling |
| Flujo Authorization Code + PKCE | ✅ | Configurado con Redirect flow |
| Ruta protegida con MsalGuard | ✅ | `/cuenta` protegida |
| Interceptors para adjuntar JWT | ✅ | `MsalInterceptor` con `protectedResourceMap` |
| Microservicio Productos (Spring Boot) | ✅ | CRUD completo, JWT validation, tests |
| Microservicio Carrito (Spring Boot) | ✅ | CRUD + scopes/roles con `@PreAuthorize` |
| `.gitignore` en frontend | ✅ | Configurado |
| Repos separados por componente | ✅ | `pedidos360-frontend`, `pedidos360-ms-productos`, `pedidos360-ms-carrito` |

---

## Lo que falta — Crítico

### 1. Azure Tenant + App Registration

**Rubro afectado:** Indicador 1 — MSAL + Angular (60%)

- [x] Guía paso a paso en frontend `docs/azure-setup.md` (tenant, App Registration SPA, redirect, scopes, App Roles, asignación, errores)
- [ ] Crear Tenant en Microsoft Entra ID (consola, paso 1 de la guía)
- [ ] Registrar aplicación (App Registration)
- [ ] Configurar URIs de redirección (`http://localhost:4200`)
- [ ] Definir scopes (`Productos.Read`, `Carrito.ReadWrite`)
- [ ] Crear roles de usuario (`Cliente`, `Admin`) y asignarlos
- [ ] Reemplazar `TODO-*` en `src/environments/environment.ts`

**Sin esto nada funciona.** Login retorna error de client inválido.

### 2. AWS API Gateway

**Rubro afectado:** Indicador 2 — BFF (40%)

- [x] Guía completa en frontend `docs/aws-setup.md` (resources, proxy HTTP, CORS, EC2, pruebas)
- [x] Dockerfiles multi-stage para `ms-productos` y `ms-carrito` (+ `.dockerignore`)
- [ ] Crear API Gateway (REST) como único punto de entrada
- [ ] Crear rutas hacia `ms-productos` y `ms-carrito`
- [ ] Configurar CORS permitiendo solo el dominio del frontend
- [ ] Desplegar ambos microservicios en instancias EC2
- [ ] Configurar el frontend para apuntar al Gateway (`apiUrl` + `useGateway: true`)

### 3. JWT Authorizer en el Gateway

**Rubro afectado:** Indicador 2 — BFF (40%)

- [x] Lambda authorizer en `docs/lambda-authorizer/` (`jose`, JWKS de Azure: firma, `iss`, `aud`, expiración) — quedó como **referencia no desplegada** de evaluación 1. NO está en producción. No sirve tal cual para el API actual porque (a) responde con política IAM, formato de **REST API**, mientras el API desplegado es **HTTP API** (una Lambda authorizer ahí debe ser tipo REQUEST payload 2.0 y responder `{ isAuthorized, context }`), y (b) valida el issuer en forma **v2.0** (`login.microsoftonline.com/<tenant>/v2.0`) cuando los tokens reales de este tenant son **v1.0** (`iss` = `https://sts.windows.net/<tenant>/`, JWKS en `<tenant>/discovery/keys`)
- [x] Respuesta 401 (token ausente/inválido) y 403 (policy Deny sin scope/rol)
- [x] Reglas por ruta: `/productos` GET público; escritura = scope `Productos.Read` o rol `Admin`; `/carrito*` = scope `Carrito.ReadWrite` o rol `Cliente`/`Admin`
- [x] Authorizer JWT nativo del HTTP API en producción (API `13uwepgzy9`, stage `desarrollo`) con issuer v1 `https://sts.windows.net/e5372bf0-c5e3-4286-887c-79069f209c1f/` y audience `api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c`. La Lambda como tal sigue sin crearse (no se necesita mientras solo haya Azure)
- [x] Authorizer asociado a los métodos del Gateway: las rutas seguras lo llevan adjunto; las rutas `OPTIONS` van **sin** authorizer a propósito (el authorizer interceptaba los preflight y rompía el CORS)

> **Nota:** Los microservicios también validan JWT internamente, pero la validación perimetral ya está resuelta en el Gateway (authorizer JWT nativo del HTTP API).

### 3b. Si se agrega Cognito (tarea 2026-10-09)

- El authorizer JWT nativo acepta **un solo issuer y un solo audience**, así que Azure + Cognito a la vez es imposible con el nativo: hace falta una **Lambda REQUEST authorizer**.
- Debe detectar el proveedor leyendo `iss` del payload **sin verificar firma**: `https://cognito-idp.<region>.amazonaws.com/<userPoolId>` → JWKS del user pool (más `token_use`/`client_id`); `https://sts.windows.net/<tenant>/` → JWKS v1 de Azure + audience `api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c`.
- Mantener la matriz: sin token → 401, inválido → 401, válido sin scope/rol → 403, `GET /productos` público sin token.
- Redesplegar el stage después de adjuntarla, y verificar que las rutas `OPTIONS` sigan sin authorizer.

### 4. Conectar catálogo real al frontend

- [x] Crear `Services` directory en el frontend (`src/app/services/`)
- [x] Implementar `ProductoService` con `HttpClient` (dev directo a `:8081`, prod vía Gateway)
- [x] Reemplazar `productos.mock.ts` por datos reales (queda como fallback offline en el service)
- [x] `core/models/producto.ts`: mapeo backend→vista (`nombre`→`titulo`, `precioClp`→`precio`, categoría sin tildes → etiqueta + arte visual)
- [x] Crear `environment.prod.ts` + `fileReplacements` + `useGateway` flag
- [ ] Apuntar al API Gateway real (completar URLs en `environment.*` + `useGateway: true`)

### 5. Página de carrito

- [x] Crear componente `Carrito` (básico: lista, cantidades +/−, quitar, total, checkout)
- [x] Crear ruta `/carrito` protegida con `MsalGuard`
- [x] Implementar `CarritoService` para CRUD de items (con `signal count` para el badge)
- [x] Botón "Agregar" del home conectado (si no hay sesión → login)
- [x] Actualizar el badge del navbar con cantidad real
- [x] Enriquecer items con datos del catálogo (título/arte, `forkJoin` catálogo+carrito) y pulir estilos
- [x] Refactor: componente reutilizable `ProductoArte` (usado en home y carrito)

### 6. Lectura de roles/scopes en UI

- [x] `AuthService`: `acquireTokenSilent` + decode del access token → signals `roles`, `esCliente`, `esAdmin`, `oid`, `scopes`, `nombre`
- [x] Guard por rol `adminGuard` + ruta `/admin` protegida (`MsalGuard` + `adminGuard`)
- [x] Navbar muestra link "Admin" solo si el claim `roles` contiene `Admin` (`app.html`)
- [x] Página `/cuenta` con chips de rol (`Cliente`/`Admin`) y scopes del access token (`cuenta.ts`)
- [x] Guía de Azure para App Roles + scopes + asignación de usuarios en `docs/azure-setup.md`
- [ ] Azure: crear Tenant + App Registration + App Roles y asignar usuarios (pasos 1–6 de la guía)
- [ ] Reemplazar `TODO-*` de `src/environments/environment.ts` → login real funcionando

---

## Orden sugerido de ejecución (lo que queda)

1. **Azure Tenant + App Registration** → desbloquea login real (pasos de `docs/azure-setup.md`)
2. **AWS API Gateway + JWT Authorizer** → cumple el 40% del rubro (BFF)
3. **CORS en el Gateway** → requiere saber el dominio del frontend
4. **Apuntar el frontend al Gateway** (`environment.*` + `useGateway: true`) → flujo end-to-end
5. **Tag `v1.0.0`** cuando login + catálogo + carrito funcionen end-to-end

---

*Última actualización: septiembre 2026*
