/**
 * Azure AD / Entra ID (tenant josecamposar, App Registration Pedidos360).
 * clientId/tenantId NO son secretos: este archivo SÍ se commitea.
 * Nunca pongas un client secret acá (un SPA no lleva secret).
 */
export const environment = {
  production: false,
  /**
   * useGateway=true → todas las llamadas van al API Gateway (único punto de entrada).
   * useGateway=false → desarrollo local directo a los microservicios (ms-productos :8081, ms-carrito :8082).
   * Pasa a true cuando el Gateway de AWS esté desplegado (fase 2 del plan).
   */
  useGateway: false,
  apiUrl: 'http://localhost:8000/api', // TODO: URL base del API Gateway (AWS)
  productosUrl: 'http://localhost:8081',
  carritoUrl: 'http://localhost:8082',
  azure: {
    clientId: '446c57cb-aba2-4b7a-ab01-6f2e6af7d35c',
    authority: 'https://login.microsoftonline.com/e5372bf0-c5e3-4286-887c-79069f209c1f',
    knownAuthorities: ['login.microsoftonline.com'],
    redirectUri: 'http://localhost:4200',
    // Scopes que pedirá MsalGuard al loguear y MsalInterceptor al llamar a la API.
    apiScopes: [
      'api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c/Productos.Read',
      'api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c/Carrito.ReadWrite',
    ],
  },
};
