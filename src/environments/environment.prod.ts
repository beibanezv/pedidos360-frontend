/**
 * Entorno de producción: el frontend siempre apunta al API Gateway de AWS.
 * Es el archivo que Angular inyecta al buildar con --configuration production
 * (fileReplacements en angular.json).
 *
 * C1 pendiente: cuando Benjamín entregue el manifiesto del entorno único, actualizar
 * apiUrl, redirects, pool/cliente de Cognito y WSS una sola vez aquí. Hoy refleja el
 * despliegue mínimo usado para verificar WebPay, no un entorno definitivo.
 * clientId/tenantId NO son secretos: este archivo SÍ se commitea.
 */
export const environment = {
  production: true,
  useGateway: true,
  // Invoke URL del API Gateway de negocio (stage "desarrollo").
  // Los resources del Gateway son /productos, /carrito y /login (ver docs/aws-setup.md).
  apiUrl: 'https://w9om0sanri.execute-api.us-east-1.amazonaws.com/desarrollo',
  productosUrl: '',
  carritoUrl: '',
  loginUrl: '',
  ordenesUrl: '',
  pagosUrl: '',
  analyticsUrl: '',
  metricasWsUrl: '', // Configurar el endpoint WSS antes de publicar el panel.
  azure: {
    clientId: '446c57cb-aba2-4b7a-ab01-6f2e6af7d35c',
    authority: 'https://login.microsoftonline.com/e5372bf0-c5e3-4286-887c-79069f209c1f',
    knownAuthorities: ['login.microsoftonline.com'],
    redirectUri: 'https://epko9lnv5a.execute-api.us-east-1.amazonaws.com/desarrollo/', // URL https pública del frontend (vía Gateway, con slash: el path vacío no calza en las rutas del API)
    apiScopes: [
      'api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c/Productos.Read',
      'api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c/Carrito.ReadWrite',
    ],
  },
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_GKASCM5yT',
    clientId: '3t7gk2dqc29fn1bjgr87j31j81',
    domain: 'https://pedidos360-394368726174.auth.us-east-1.amazoncognito.com',
    // En producción el frontend se sirve con baseHref /desarrollo/, así que el
    // callback vive bajo esa misma ruta. OJO: hay que registrar esta URL como
    // "Callback URL" del cliente Cognito en AWS; si solo está localhost, el
    // login desplegado no completa el canje.
    redirectUri: 'https://epko9lnv5a.execute-api.us-east-1.amazonaws.com/desarrollo/cognito/callback',
    scopes: ['openid', 'email', 'profile'],
  },
};

