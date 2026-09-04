# Configuración de Azure Entra ID (IDaaS) para Pedidos360

Guía para ir de los `TODO-*` de `src/environments/environment.ts` a un login real
con MSAL + roles (`Cliente`/`Admin`) y scopes (`Productos.Read`, `Carrito.ReadWrite`).

Los valores que produzcas se copian en:

- `src/environments/environment.ts` (dev)
- `src/environments/environment.prod.ts` (build de producción)

> Nunca pongas secrets acá: `clientId`/`tenantId` no lo son. Un SPA no debe tener client secret.

---

## 1. Tenant

- Entra en https://portal.azure.com con una cuenta que tenga permiso de administrador de
  tenant (convertir la suscripción deun estudiante DuocUC en tenant de desarrollo es válido).
- O crea uno gratuito de pruebas: *Microsoft Entra ID → Manage tenants → Create*,
  tipo **Azure Active Directory** (no "workload identities"), régimen de prueba "Free".

> Un tenant personal de `@outlook.com` NO sirve: Azure AD compara `iss` del token contra
> `authority`. Usa uno de desarrollo (p. ej. `...onmicrosoft.com`).

## 2. App Registration (SPA)

1. *Microsoft Entra ID → App registrations → New registration*.
2. Nombre: `Pedidos360` — tipo de cuenta: **Accounts in this organizational directory only**
   (single tenant; si eliges multitenant, ajusta `authority`).
3. Redirect URI (móvil/nativa y SPA): selecciona **Single-page application (SPA)** y agrega:
   - `http://localhost:4200`

## 3. Expose an API → scopes (delegated)

1. En la App Registration → *Expose an API* → *Add a scope*.
2. Application ID URI: acepta el por defecto `api://<client-id>`.
3. Crea dos scopes:

| Scope | Who can consent | Suggested access |
|---|---|---|
| `Productos.Read` | Admins and users | Lectura del catálogo (→ ms-productos) |
| `Carrito.ReadWrite` | Admins and users | Lectura/escritura del carrito (→ ms-carrito) |

> En el access token, estos scopes aparecen en el claim `scp` como
> `api://<client-id>/Productos.Read` y `api://<client-id>/Carrito.ReadWrite`.
> Copia las URIs completas a `environment.azure.apiScopes`.

## 4. App Roles → roles de usuario (RBAC)

Los roles aparecen en el claim `roles` del access token. Sin ellos, `hasRole('Cliente')`
en ms-carrito y `esAdmin()` en el front nunca serán true.

1. En la App Registration → *App roles* → *Create app role*.

| Role | Allowed member types | Value (debe coincidir EXACTO) | Description |
|---|---|---|---|
| Cliente | **Users/Groups** | `Cliente` | Compra en la tienda |
| Admin | **Users/Groups** | `Admin` | Administra el catálogo |

Equivalente en el manifest (`appRoles`):

```json
"appRoles": [
  {
    "allowedMemberTypes": ["User"],
    "displayName": "Cliente",
    "id": "00000000-0000-0000-0000-000000000001",
    "isEnabled": true,
    "description": "Compra en la tienda",
    "value": "Cliente"
  },
  {
    "allowedMemberTypes": ["User"],
    "displayName": "Admin",
    "id": "00000000-0000-0000-0000-000000000002",
    "isEnabled": true,
    "description": "Administra el catálogo",
    "value": "Admin"
  }
]
```

## 5. Asignar los roles a usuarios

1. *Microsoft Entra ID → Enterprise applications → Pedidos360 → Users and groups → Add user/group*.
2. Selecciona un usuario y asígnale **Cliente** (y `Admin` si quieres probar esa ruta).
3. Opcional: *Manage → User consent settings* y activa "Allow user consent for apps" para
   que el primer login pida consentimiento de los scopes delegados.

## 6. Llenar `environment.ts` / `environment.prod.ts`

```ts
azure: {
  clientId: '<Application (client) ID>',
  authority: 'https://login.microsoftonline.com/<Directory (tenant) ID>',
  knownAuthorities: ['login.microsoftonline.com'],
  redirectUri: 'http://localhost:4200',
  apiScopes: [
    'api://<Application ID URI>/Productos.Read',
    'api://<Application ID URI>/Carrito.ReadWrite',
  ],
}
```

## 7. Verificación

1. `npm start` → *Ingresar* → te redirige a Microsoft, consientes, y vuelves a `/cuenta`.
2. En `/cuenta` deben aparecer los chips `Cliente`/`Admin` y los scopes.
3. Link **Admin** en el navbar solo si el usuario tiene el rol `Admin` (guard `adminGuard`).

---

## Alternativa con Azure CLI (script)

Crea una variable con el tenant y el nombre de la app, luego:

```bash
# Login y tenant
az login
TENANT_ID="<tu-tenant-id>"
APP_NAME="Pedidos360"

# App Registration SPA con redirect y explicit client assertion (SPA sin secret)
# 1. Crear la app registrada (sale el clientId en `id`... usar --query)
az ad app create --display-name "$APP_NAME" --sign-in-audience AzureADMyOrg \
  --query id -o tsv

# 2. Agregar scopes (exponer API) y app roles se hace en el portal o vía
#    `az ad app update --identifier-uris` + edición del manifest.
```

La UI del portal sigue siendo la vía recomendada para scopes y app roles por el manejo
de consentimiento; con `az` tienes que batallar con JSON por atributo.

---

## Errores comunes

- **AADSTS7000112 / invalid client** → `clientId` aún es `TODO-*`.
- **AADSTS500011** → la URI `api://clientId/...` del scope no coincide con la expuesta.
- **No aparecen roles** → el usuario no está asignado (paso 5) o estás leyendo el
  `id_token` (los roles viven en el access token; ver `AuthService`).
- **403 en ms-carrito** → el token no trae `scp: Carrito.ReadWrite` ni `roles: Cliente/Admin`.