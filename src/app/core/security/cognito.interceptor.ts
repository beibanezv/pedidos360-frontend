import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { CognitoAuthService } from './cognito-auth.service';

/**
 * Adjunta el id_token de Cognito cuando la request va al backend/Gateway
 * y MSAL no ya puso un Authorization (segunda vía de login).
 */
export const cognitoInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('Authorization')) return next(req);
  const url = req.url;
  const bases = [environment.apiUrl, environment.productosUrl, environment.carritoUrl, environment.loginUrl, environment.ordenesUrl].filter(
    (b) => !!b,
  );
  if (!bases.some((b) => url.startsWith(b as string))) return next(req);
  const token = inject(CognitoAuthService).token();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
