import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { esApi } from './api-bases';
import { CognitoAuthService } from './cognito-auth.service';

/**
 * Adjunta el id_token de Cognito cuando la request va al backend/Gateway
 * y MSAL no ya puso un Authorization (segunda vía de login).
 */
export const cognitoInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('Authorization') || !esApi(req.url)) return next(req);
  const token = inject(CognitoAuthService).token();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
