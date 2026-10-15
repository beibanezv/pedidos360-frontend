import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { IPublicClientApplication, InteractionType, PublicClientApplication } from '@azure/msal-browser';
import { MsalModule, MsalInterceptorConfiguration, MsalGuardConfiguration } from '@azure/msal-angular';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { azureInterceptor } from './core/security/azure.interceptor';
import { cognitoInterceptor } from './core/security/cognito.interceptor';

function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.azure.clientId,
      authority: environment.azure.authority,
      knownAuthorities: environment.azure.knownAuthorities,
      redirectUri: environment.azure.redirectUri,
    },
  });
}

function msalGuardFactory(): MsalGuardConfiguration {
  return { interactionType: InteractionType.Redirect, loginFailedRoute: '/' };
}

function msalInterceptorFactory(): MsalInterceptorConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    // SIMPLIFICADO: en local (useGateway:false) el front llama directo a los MSs,
    // asi que el mapa incluye sus URLs; apiUrl queda para la futura Gateway.
    // msal-angular v6 usa strict matching (^...$ por componente de URL): la key debe
    // terminar en /* para cubrir todas las rutas bajo esa base. Se omiten bases vacias.
    protectedResourceMap: new Map(
      [environment.apiUrl, environment.productosUrl, environment.carritoUrl, environment.loginUrl, environment.ordenesUrl]
        .filter((base) => !!base)
        .map((base) => [`${base}/*`, environment.azure.apiScopes] as [string, string[]]),
    ),
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // MsalModule.forRoot registra MsalService/Guard/Broadcast. El interceptor de
    // clase (MsalInterceptor) se eliminó a propósito: ante un 401/403 disparaba
    // el login Redirect de Azure aunque el request llevara token de Cognito
    // (o ninguno), secuestrando esas sesiones. En su lugar van dos
    // interceptores funcionales que solo adjuntan y nunca redirigen:
    // azureInterceptor (si hay cuenta MSAL) y luego cognitoInterceptor.
    importProvidersFrom(
      MsalModule.forRoot(msalInstanceFactory(), msalGuardFactory(), msalInterceptorFactory()),
    ),
    provideHttpClient(withInterceptors([azureInterceptor, cognitoInterceptor])),
  ],
};
