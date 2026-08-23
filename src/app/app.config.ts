import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { IPublicClientApplication, InteractionType, PublicClientApplication } from '@azure/msal-browser';
import { MsalModule, MsalInterceptor, MsalInterceptorConfiguration, MsalGuardConfiguration } from '@azure/msal-angular';

import { environment } from '../environments/environment';
import { routes } from './app.routes';

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
    protectedResourceMap: new Map([[environment.apiUrl, environment.azure.apiScopes]]),
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // MsalModule.forRoot registra MsalService/Guard/Broadcast pero NO el interceptor:
    // HTTP_INTERCEPTORS se registra aparte para que MsalInterceptor adjunte el JWT.
    importProvidersFrom(
      MsalModule.forRoot(msalInstanceFactory(), msalGuardFactory(), msalInterceptorFactory()),
    ),
    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
    provideHttpClient(withInterceptorsFromDi()),
  ],
};
