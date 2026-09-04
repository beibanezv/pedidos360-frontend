# Despliegue en AWS — Pedidos360

Infraestructura para el **BFF** (Indicador 2): un API Gateway REST como único punto
de entrada, protegido por un **Lambda Authorizer** que valida el JWT de Azure AD
(firma contra JWKS, `iss`, `aud` y vigencia) y rechaza con 401/403.

Ingredientes: 2 instancias EC2 (ms-productos :8081, ms-carrito :8082) + 1 Lambda
authorizer + 1 API Gateway.

---

## 0. Pre-requisitos

- Cuenta AWS con IAM (poder crear EC2, Lambda, API Gateway).
- Docker local para buildar las imágenes.
- Pares de llaves EC2 (region us-east-1 o la que uses).
- Ya tener el tenant Azure + App Registration (ver `docs/azure-setup.md` en el frontend).

## 1. Buildar y publicar las imágenes (o copiarlas a la EC2)

```bash
# en pedidos360-ms-productos
docker build -t pedidos360/ms-productos .
# en pedidos360-ms-carrito
docker build -t pedidos360/ms-carrito .
```

Para EC2 puedes: subir la imagen al **Amazon ECR** (recomendado) o `docker save` +
`scp` la imagen a la instancia. Ajusta bien los nombres de las variables en el paso 2.

> El Dockerfile compila y corre los tests del microservicio dentro de la imagen.

## 2. Instancias EC2 (una por microservicio)

Crea dos EC2 (t2.micro basta para la demo, Amazon Linux 2023) e instala Docker:

```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
# (re-login / nuevo ssh)
```

Pega la imagen y corre cada microservicio con perfil `prod`. Necesitas una Postgres
alcanzable (RDS o una Postgres local en la propia EC2); apunta las URLs:

```bash
# EC2 #1 — ms-productos
docker run -d --name ms-productos -p 8081:8081 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://<RDS_ENDPOINT>:5432/pedidos360_productos" \
  -e SPRING_DATASOURCE_USERNAME="pedidos360" \
  -e SPRING_DATASOURCE_PASSWORD="<password>" \
  -e AZURE_TENANT_JWKS_URI="https://login.microsoftonline.com/<TENANT_ID>/v2.0" \
  pedidos360/ms-productos
```

```bash
# EC2 #2 — ms-carrito
docker run -d --name ms-carrito -p 8082:8082 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://<RDS_ENDPOINT>:5432/pedidos360_carrito" \
  -e SPRING_DATASOURCE_USERNAME="pedidos360" \
  -e SPRING_DATASOURCE_PASSWORD="<password>" \
  -e AZURE_TENANT_JWKS_URI="https://login.microsoftonline.com/<TENANT_ID>/v2.0" \
  pedidos360/ms-carrito
```

Security Group: abre **8081/8082** (o solo desde el VPC). Verifica localmente:

```bash
curl http://localhost:8081/productos    # 200
curl http://localhost:8082/carrito      # 401 (sin token)
```

## 3. Lambda authorizer

Código en `docs/lambda-authorizer/` (Node 20, dependencia única `jose`).

```bash
cd docs/lambda-authorizer
npm install
# Empaquetar index.mjs + node_modules
# Linux/mac:
zip -r authorizer.zip index.mjs node_modules
# PowerShell:
Compress-Archive -Path index.mjs, node_modules -DestinationPath authorizer.zip
```

En la consola Lambda:

1. *Create function* → **Author from scratch**, runtime **Node.js 20.x**.
2. Sube `authorizer.zip` (Upload from → zipped file).
3. *Configuration → Environment variables*:
   - `AZURE_TENANT_ID` = Directory (tenant) ID
   - `AZURE_CLIENT_ID` = Application (client) ID
4. Prueba: *Test* con un evento `{"type":"TOKEN","methodArn":"arn:aws:execute-api:us-east-1:ACCOUNT:API_ID/prod/GET/productos","authorizationToken":"Bearer <token-del-cuenta>","methodArn":"..."}`.
   - Sin token → error "Unauthorized".
   - Token real del navegador (DevTools → Network → autorización) → policy Allow.

## 4. API Gateway REST

1. *API Gateway → Create API → **REST API** → Build*: nombre `Pedidos360`, tipo **Regional**.
2. **Resources** (crear en este orden under `/`):
   - `/productos`, `/productos/{id}` (path param)
   - `/carrito`, `/carrito/items`, `/carrito/items/{id}`, `/carrito/checkout`
3. Por cada **método** (productos: GET/POST/PUT/DELETE; carrito: GET/POST/PUT/DELETE;
   **OPTIONS** en todos para CORS):
   - *Integration type* → **HTTP**, checkbox **Use proxy integration** (ON).
   - *HTTP method*: igual al del método.
   - *Endpoint URL*:
     - `/productos*` → `http://<EC2-PUBLIC-DNS-1>:8081`
     - `/carrito*` → `http://<EC2-PUBLIC-DNS-2>:8082`
   - Con proxy, el path del request (`/productos`, `/carrito/items/{id}`, …) se
     pasa tal cual al backend. No uses prefijo `/api` en los resources.
4. **CORS** (Enable CORS on … for each resource):
   - Allow Origin: `http://localhost:4200` (o el dominio del frontend en prod).
   - Allow Methods: `GET,POST,PUT,DELETE,OPTIONS`.
   - Allow Headers: `Content-Type,Authorization,X-Requested-With`.
   - OPTIONS **no debe llevar authorizer** (deja *None*).
5. **Authorizer** (aplicar a los métodos, excepto `GET /productos` y `OPTIONS`):
   - *Authorizers → Create authorizer*: type **TOKEN**, **Lambda** `pedidos360-jwt-authorizer`.
   - *Identity source*: `method.request.header.Authorization`.
   - *Token validation expression*: `^Bearer [A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_=]+$`.
   - Reutilización (TTL) 60 s; en la demo baja el TTL para ver más fácil los cambios.
   - En *Method Request*, asocia el authorizer a los métodos protegidos.
6. **Deploy**: *Actions → Deploy API* → Stage `prod`. Guarda el Invoke URL:
   `https://<API_ID>.execute-api.<REGION>.amazonaws.com/prod`

## 5. Pruebas (evidencia 401/403 vs 200)

```bash
BASE="https://<API_ID>.execute-api.<REGION>.amazonaws.com/prod"

# 1. Sin token → 401
curl -i $BASE/carrito

# 2. Token inválido → 401
curl -i -H "Authorization: Bearer abc.def.ghi" $BASE/carrito

# 3. Token válido SIN scope/rol (usuario no asignado al rol y sin consentimiento) → 403
curl -i -H "Authorization: Bearer $TOKEN_SIN_SCOPE" $BASE/carrito

# 4. Token válido → 200
curl -i -H "Authorization: Bearer `$TOKEN`" $BASE/carrito

# 5. Catálogo público → 200 sin token
curl -i $BASE/productos
```

Guarda una captura de cada salida (`curl -i` muestra el status code) para la entrega.

## 6. Conectar el frontend

1. `src/environments/environment.prod.ts`:

```ts
export const environment = {
  production: true,
  useGateway: true,
  apiUrl: 'https://<API_ID>.execute-api.<REGION>.amazonaws.com/prod',
  // productosUrl/carritoUrl vacíos: no se usan con useGateway=true
  azure: { /* valores reales de la guía azure-setup.md */ },
};
```

2. Build production: `npm run build` (inyecta `environment.prod.ts` vía
   `fileReplacements` de `angular.json`) y despliega el `dist/` (S3+CloudFront, EC2
   con nginx, etc.).

> El `MsalInterceptor` ya adjunta el JWT automáticamente a las llamadas al Gateway
> (el `protectedResourceMap` usa `environment.apiUrl` cuando `useGateway` es true).

## Errores comunes AWS

- **401 al probar OPTIONS** → quita el authorizer del preflight.
- **403 en todas las rutas con token válido** → `aud`/`iss` mal en la Lambda, o el
  scope/rol no está asignado (revísalo en el claim con jwt.io).
- **502 en la integración** → la EC2 no responde: security group cerrado o app caída.
- **404 en el Gateway** → los resources no coinciden con `/productos`, `/carrito` (sin `/api`).