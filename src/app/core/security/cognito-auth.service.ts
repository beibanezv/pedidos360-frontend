import { Injectable, computed, signal } from '@angular/core';

import { environment } from '../../../environments/environment';

export interface CognitoClaims {
  sub?: string;
  email?: string;
  name?: string;
  'cognito:username'?: string;
  [claim: string]: unknown;
}

function decodePayload(segment?: string): CognitoClaims {
  if (!segment) return {};
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const utf8 = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(utf8) as CognitoClaims;
  } catch {
    return {};
  }
}

function randomVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function challengeOf(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const K_ID = 'p360-cognito-id';
const K_ACCESS = 'p360-cognito-access';
const K_VERIFIER = 'p360-cognito-verifier';
const K_STATE = 'p360-cognito-state';

/** Comprobación local de forma y expiración: la validación criptográfica sigue siendo del backend. */
function tokenValido(token: string | null): token is string {
  if (!token || token.split('.').length !== 3) return false;
  const exp = decodePayload(token.split('.')[1])['exp'];
  return typeof exp === 'number' && exp > Date.now() / 1000;
}

function tokenGuardado(): string | null {
  const token = sessionStorage.getItem(K_ID);
  return tokenValido(token) ? token : null;
}

/**
 * Segunda vía de login: Cognito Hosted UI (Authorization Code + PKCE).
 * Convive con MSAL/Azure: guarda el id_token en sessionStorage y el
 * interceptor lo adjunta cuando MSAL no tiene cuenta activa.
 */
@Injectable({ providedIn: 'root' })
export class CognitoAuthService {
  private readonly tokenInicial = tokenGuardado();
  readonly logueadoCognito = signal(!!this.tokenInicial);
  readonly claimsCognito = signal<CognitoClaims>(decodePayload(this.tokenInicial?.split('.')[1]));

  constructor() {
    // Un id_token vencido o corrupto no es una sesión: se descarta al restaurar.
    if (!this.tokenInicial && sessionStorage.getItem(K_ID)) this.limpiarSesionLocal();
  }

  readonly nombreCognito = computed(
    () =>
      this.claimsCognito().name ||
      this.claimsCognito().email ||
      this.claimsCognito()['cognito:username'] ||
      'Usuario Cognito',
  );

  private get cfg() {
    return environment.cognito;
  }

  /**
   * Token que se manda al Gateway. Es el id_token, no el access_token.
   * SIMPLIFICADO: el access_token de Cognito no trae el claim `email` y
   * ms-carrito lo necesita para saber a quién notificar la compra; el id_token
   * sí lo trae. Camino de upgrade: pedir el scope `aws.cognito.signin.user.admin`
   * o usar un app client con scopes propios, y mandar el access_token (que es
   * el token pensado para llamar a un API).
   */
  token(): string | null {
    const token = sessionStorage.getItem(K_ID);
    if (!tokenValido(token)) {
      if (token) this.limpiarSesionLocal();
      return null;
    }
    return token;
  }

  /** La guardia pregunta al usar la sesión, no solo al construir el servicio. */
  sesionValida(): boolean {
    return this.token() !== null;
  }

  async login(): Promise<void> {
    const verifier = randomVerifier();
    sessionStorage.setItem(K_VERIFIER, verifier);
    const challenge = await challengeOf(verifier);
    // El state protege el round-trip contra CSRF: se compara al volver del
    // Hosted UI. Sin él, un código de autorización ajeno podría inyectarse.
    const state = randomVerifier();
    sessionStorage.setItem(K_STATE, state);
    const params = new URLSearchParams({
      client_id: this.cfg.clientId,
      response_type: 'code',
      scope: this.cfg.scopes.join(' '),
      redirect_uri: this.cfg.redirectUri,
      state,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });
    window.location.href = `${this.cfg.domain}/oauth2/authorize?${params.toString()}`;
  }

  async completarLogin(code: string, state?: string | null): Promise<void> {
    const stateGuardado = sessionStorage.getItem(K_STATE);
    sessionStorage.removeItem(K_STATE);
    if (!state || state !== stateGuardado) {
      throw new Error('State invalido: se descarta el codigo por posible CSRF');
    }
    const verifier = sessionStorage.getItem(K_VERIFIER);
    if (!verifier) throw new Error('Sin code_verifier (reintenta el login)');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.cfg.clientId,
      redirect_uri: this.cfg.redirectUri,
      code,
      code_verifier: verifier,
    });
    const resp = await fetch(`${this.cfg.domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!resp.ok) throw new Error(`Token endpoint ${resp.status}`);
    const json = (await resp.json()) as { id_token: string; access_token: string };
    if (!tokenValido(json.id_token)) throw new Error('id_token inválido o vencido');
    sessionStorage.setItem(K_ID, json.id_token);
    sessionStorage.setItem(K_ACCESS, json.access_token);
    sessionStorage.removeItem(K_VERIFIER);
    this.logueadoCognito.set(true);
    this.claimsCognito.set(decodePayload(json.id_token.split('.')[1]));
  }

  logout(): void {
    this.limpiarSesionLocal();
    const params = new URLSearchParams({
      client_id: this.cfg.clientId,
      logout_uri: environment.azure.redirectUri,
    });
    window.location.href = `${this.cfg.domain}/logout?${params.toString()}`;
  }

  salirLocal(): void {
    this.limpiarSesionLocal();
  }

  private limpiarSesionLocal(): void {
    sessionStorage.removeItem(K_ID);
    sessionStorage.removeItem(K_ACCESS);
    sessionStorage.removeItem(K_STATE);
    sessionStorage.removeItem(K_VERIFIER);
    this.logueadoCognito.set(false);
    this.claimsCognito.set({});
  }
}
