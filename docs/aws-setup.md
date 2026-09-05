# Despliegue en AWS — Pedidos360 (estilo visto en clase)

Infraestructura para el **BFF / API Manager** (Indicador 2): un **HTTP API** de
API Gateway como único punto de entrada, con **autorizador JWT nativo** que
valida el token de Azure AD (firma contra JWKS, `iss`, `aud` y vigencia) y
rechaza con 401/403. La validación fina de roles/scopes vive en ms-carrito
(`@PreAuthorize`), como exige la rúbrica.

Máquinas (confirmado por el profesor: 3 EC2 + 1 RDS):
2. EC2 #1 — ms-productos :8081 → RDS
3. EC2 #2 — ms-carrito :8082 → RDS
4. EC2 #3 — ms-login :8083 (sin BD: solo decodifica el JWT)
5. EC2 #4 (misma u otra instancia) — frontend nginx :80, publicado con https
   vía un segundo HTTP API con ruta `{proxy+}` (ver sección 7).

> `docs/lambda-authorizer/` (REST + Lambda TOKEN) queda como **referencia no
> desplegada**: la defensa usa solo lo visto en clase (HTTP API + autorizador
> nativo). Avisar a Matías antes de borrarlo.

---

## 0. Pre-requisitos

- Cuenta AWS Academy Learner Lab. **OJO: el Lab resetea recursos entre
  sesiones** — no dejes el deploy "listo" con antelación; reconstrúyelo cerca
  de la entrega siguiendo esta guía (ideal: script de provisión).
- Pares de llaves EC2 (región del Lab, normalmente us-east-1).
- Tenant Azure + App Registration listos (ver `docs/azure-setup.md`).

## 1. Imágenes Docker (una por microservicio)

```bash
# en pedidos360-ms-productos / ms-carrito / ms-login
docker build -t pedidos360/ms-productos .
docker build -t pedidos360/ms-carrito .
docker build -t pedidos360/ms-login .
```

Sube a **ECR** o `docker save` + `scp` a cada EC2.

> Cada Dockerfile compila y corre los tests dentro de la imagen.

## 2. EC2 + RDS (una EC2 por microservicio)

Crea tres EC2 (t2.micro basta, Amazon Linux 2023) e instala Docker:

```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
# (re-login / nuevo ssh)
```

Crea **un RDS Postgres** (o una Postgres local en una EC2 para la demo) con
las BD `pedidos360_productos` y `pedidos360_carrito`, y corre cada servicio
con perfil `prod`:

```bash
# EC2 #1 — ms-productos
docker run -d --name ms-productos -p 8081:8081 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://<RDS_ENDPOINT>:5432/pedidos360_productos" \
  -e SPRING_DATASOURCE_USERNAME="pedidos360" \
  -e SPRING_DATASOURCE_PASSWORD="<password>" \
  -e AZURE_TENANT_ID="<Directory (tenant) ID>" \
  pedidos360/ms-productos

# EC2 #2 — ms-carrito
docker run -d --name ms-carrito -p 8082:8082 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://<RDS_ENDPOINT>:5432/pedidos360_carrito" \
  -e SPRING_DATASOURCE_USERNAME="pedidos360" \
  -e SPRING_DATASOURCE_PASSWORD="<password>" \
  -e AZURE_TENANT_ID="<Directory (tenant) ID>" \
  pedidos360/ms-carrito

# EC2 #3 — ms-login (sin BD)
docker run -d --name ms-login -p 8083:8083 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e AZURE_TENANT_ID="<Directory (tenant) ID>" \
  pedidos360/ms-login
```

Security Group: abre **8081/8082/8083** (o solo desde el VPC). Verifica:

```bash
curl http://localhost:8081/productos    # 200
curl http://localhost:8082/carrito      # 401 (sin token)
curl http://localhost:8083/login/me     # 401 (sin token)
```

## 3. API Gateway HTTP API (Método A: una ruta por método)

Como en `enrutando nuestra api segura.docx` y el tutorial 1.1.2:

1. *API Gateway → Create API → **HTTP API** → Build*: nombre `Pedidos360`.
2. **Rutas** (una por método — Método A; NO usar proxy `/{proxy+}` para el
   API de negocio porque se pierde monitoreo y control por ruta):
   - `GET /productos` (pública, sin autorizador)
   - `POST /productos`, `PUT /productos/{id}`, `DELETE /productos/{id}`
   - `GET /carrito`, `POST /carrito/items`, `PUT /carrito/items/{id}`,
     `DELETE /carrito/items/{id}`, `POST /carrito/checkout`
   - `GET /login/me`
3. Por cada ruta: integración **HTTP URI** a la EC2 correspondiente, ej.
   `http://<EC2-1>:8081/productos`, con el mismo método.
4. **Stage** `desarrollo` (como en clase). Guarda la Invoke URL:
   `https://<API_ID>.execute-api.<REGION>.amazonaws.com/desarrollo`

## 4. Autorizador JWT nativo (rutas seguras → 401 sin token)

Como en `enrutando nuestra api segura.docx`:

1. Decodifica un access token real en Postman/jwt.io y copia el claim `iss`
   (`https://login.microsoftonline.com/<TENANT_ID>/v2.0`).
2. *API Gateway → tu HTTP API → Authorization → Create authorizer* tipo **JWT**:
   - **Issuer**: el `iss` del paso 1.
   - **Audience**: el Application (client) ID.
3. Adjunta el autorizador a todas las rutas **excepto** `GET /productos`.
4. **Redesplegar** el stage (sin esto el cambio no aplica).
5. Prueba: ruta pública → 200; ruta segura sin token → **401**.

## 5. CORS (consola del HTTP API, según 1.1.4)

*API Gateway → tu HTTP API → CORS → Configure*:
- Dev: `Allow-Origin: *`. Prod: el dominio exacto del frontend.
- `Allow-Headers`: `Content-Type, Authorization, ...`.
- `Allow-Methods`: según las rutas (`GET,POST,PUT,DELETE`).

## 6. Pruebas (evidencia 401/403 vs 200)

```bash
BASE="https://<API_ID>.execute-api.<REGION>.amazonaws.com/desarrollo"

# 1. Sin token → 401 (autorizador del Gateway)
curl -i $BASE/carrito

# 2. Token inválido → 401
curl -i -H "Authorization: Bearer abc.def.ghi" $BASE/carrito

# 3. Token válido SIN scope/rol → 403 (lo rechaza ms-carrito)
curl -i -H "Authorization: Bearer $TOKEN_SIN_SCOPE" $BASE/carrito

# 4. Token válido → 200
curl -i -H "Authorization: Bearer $TOKEN" $BASE/carrito

# 5. Catálogo público → 200 sin token
curl -i $BASE/productos
```

Guarda una captura de cada salida (`curl -i` muestra el status code) para la entrega.

## 7. Frontend (nginx en EC2 + https vía Gateway, según clase)

Como en `Desplegando mi frontend en AWS.docx`:

1. Dockerfile multistage node → nginx + `nginx.conf` con fallback SPA
   (`try_files $uri /index.html`); contenedor en EC2 puerto 80.
2. Segundo **HTTP API** con ruta `{proxy+}` ANY →
   `http://<IP-EC2-FRONTEND>/{proxy}` (stage `desarrollo`); la Invoke URL es
   la URL pública https del frontend. (Este `{proxy+}` es solo para publicar
   el frontend, NO para el API de negocio.)
3. Agregar esa URL https a los **redirect URIs** en Azure + a la config de
   auth del frontend, y apuntar el frontend al Gateway de negocio
   (`environment.prod.ts` abajo). Redesplegar ambos.
4. CORS en el Gateway de negocio (sección 5).

```ts
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  useGateway: true,
  apiUrl: 'https://<API_ID_NEGOCIO>.execute-api.<REGION>.amazonaws.com/desarrollo',
  azure: { /* valores reales de la guía azure-setup.md */ },
};
```

Build: `npm run build` (inyecta `environment.prod.ts` vía `fileReplacements`).

> El `MsalInterceptor` ya adjunta el JWT automáticamente a las llamadas al Gateway
> (el `protectedResourceMap` usa `environment.apiUrl` cuando `useGateway` es true).

## Errores comunes AWS

- **401 en ruta que debería ser pública** → revisa qué rutas llevan autorizador.
- **Cambios sin efecto** → falta redesplegar el stage.
- **403 en todas las rutas con token válido** → `aud`/`iss` mal en el
  autorizador, o el scope/rol no está asignado (revísalo en el claim con jwt.io).
- **502 en la integración** → la EC2 no responde: security group cerrado o app caída.
- **404 en el Gateway** → las rutas no coinciden con `/productos`, `/carrito`, `/login` (sin `/api`).
