/**
 * Valores placeholder de Azure AD / Entra ID.
 *
 * Al crear el App Registration (fase 1 del plan en AGENTS.md), reemplaza:
 *   - clientId: Application (client) ID del registro
 *   - tenantId: Directory (tenant) ID
 *   - apiScopes: URIs expuestas por el backend (api://<clientId>/Scope)
 * No pongas secretos acá: este archivo SÍ se commitea.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api', // TODO: URL base del API Gateway (AWS)
  azure: {
    clientId: 'TODO-AZURE-CLIENT-ID',
    authority: 'https://login.microsoftonline.com/TODO-AZURE-TENANT-ID',
    knownAuthorities: ['login.microsoftonline.com'],
    redirectUri: 'http://localhost:4200',
    // Scopes que pedirá MsalGuard al loguear y MsalInterceptor al llamar a la API.
    // Mientras sean placeholders, el login fallará: es lo esperado hasta tener Azure listo.
    apiScopes: [
      'api://TODO-AZURE-CLIENT-ID/Productos.Read',
      'api://TODO-AZURE-CLIENT-ID/Carrito.ReadWrite',
    ],
  },
};
