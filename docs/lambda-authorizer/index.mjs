/**
 * Pedidos360 — API Gateway JWT Authorizer (Lambda TOKEN).
 *
 * Valida el Bearer token de Azure AD:
 *   - firma contra los JWKS publicados por el tenant (jose: jwtVerify)
 *   - issuer (iss) = https://login.microsoftonline.com/<TENANT_ID>/v2.0
 *   - audience (aud) = <CLIENT_ID> de la App Registration
 *   - vigencia (exp/nbf) la aplica jwtVerify automáticamente
 *
 * Respuesta vs errores:
 *   - token ausente o inválido           → lanza (API Gateway responde 401)
 *   - token válido pero sin scope/rol    → policy Deny (API Gateway responde 403)
 *   - token válido y autorizado          → policy Allow (el request sigue al backend)
 *
 * Variables de entorno de la Lambda:
 *   AZURE_TENANT_ID   = Directory (tenant) ID del Entra ID
 *   AZURE_CLIENT_ID   = Application (client) ID (audience del token)
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;

if (!TENANT_ID || !CLIENT_ID) {
  throw new Error('Faltan AZURE_TENANT_ID / AZURE_CLIENT_ID en la configuración de la Lambda');
}

const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;
const JWKS = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`),
);

// Reglas por ruta. `publica: true` → no exige token (catálogo de lectura).
// Los scopes se comparan por su último segmento porque Azure envía
// "api://<client-id>/Productos.Read" en el claim `scp`.
const RUTAS = [
  { metodo: 'GET', recurso: '/productos', publica: true },
  { metodo: 'GET', recurso: '/productos/{id}', publica: true },
  { metodo: 'POST', recurso: '/productos', scopes: ['Productos.Read'], roles: ['Admin'] },
  { metodo: 'PUT', recurso: '/productos/{id}', scopes: ['Productos.Read'], roles: ['Admin'] },
  { metodo: 'DELETE', recurso: '/productos/{id}', scopes: ['Productos.Read'], roles: ['Admin'] },
  { metodo: 'GET', recurso: '/carrito', scopes: ['Carrito.ReadWrite'], roles: ['Cliente', 'Admin'] },
  { metodo: 'POST', recurso: '/carrito/items', scopes: ['Carrito.ReadWrite'], roles: ['Cliente', 'Admin'] },
  { metodo: 'PUT', recurso: '/carrito/items/{id}', scopes: ['Carrito.ReadWrite'], roles: ['Cliente', 'Admin'] },
  { metodo: 'DELETE', recurso: '/carrito/items/{id}', scopes: ['Carrito.ReadWrite'], roles: ['Cliente', 'Admin'] },
  { metodo: 'POST', recurso: '/carrito/checkout', scopes: ['Carrito.ReadWrite'], roles: ['Cliente', 'Admin'] },
];

function reglaPara(metodo, recurso) {
  return RUTAS.find((r) => r.recurso === recurso && r.metodo === metodo);
}

function policy(principalId, effect, arn) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{ Action: 'execute-api:Invoke', Effect: effect, Resource: arn }],
    },
  };
}

function scopeNombre(scope) {
  const s = String(scope);
  return s.includes('/') ? s.split('/').pop() : s;
}

/** `roles` viene como array; `scp` puede venir como string separado por espacios. */
function claimContiene(payload, claim, valor) {
  const raw = payload?.[claim];
  if (!raw) return false;
  const lista = Array.isArray(raw) ? raw : String(raw).split(' ');
  return lista.some((x) => (claim === 'scp' ? scopeNombre(x) === valor : x === valor));
}

function autorizado(payload, regla) {
  const porScope = regla.scopes?.some((s) => claimContiene(payload, 'scp', s));
  const porRol = regla.roles?.some((r) => claimContiene(payload, 'roles', r));
  return !!(porScope || porRol);
}

export const handler = async (event) => {
  const arn = event.methodArn;
  const partes = arn.split('/'); // [... apiId, stage, METODO, recurso...]
  const metodo = partes[3];
  const recurso = '/' + partes.slice(4).join('/');

  const regla = reglaPara(metodo, recurso);
  if (!regla) {
    // Ruta desconocida: no autorizar.
    return policy('pedidos360', 'Deny', arn);
  }

  if (regla.publica) {
    return policy('publico', 'Allow', arn);
  }

  const token = (event.authorizationToken || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    throw new Error('Unauthorized');
  }

  let payload;
  try {
    const resultado = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: CLIENT_ID,
    });
    payload = resultado.payload;
  } catch {
    throw new Error('Unauthorized');
  }

  if (autorizado(payload, regla)) {
    return policy(payload.sub || 'pedidos360', 'Allow', arn);
  }
  return policy(payload.sub || 'pedidos360', 'Deny', arn);
};