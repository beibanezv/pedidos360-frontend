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

/**
 * Segunda vía de login: Cognito Hosted UI (Authorization Code + PKCE).
 * Convive con MSAL/Azure: guarda el id_token en sessionStorage y el
 * interceptor lo adjunta cuando MSAL no tiene cuenta activa.
 */
@Injectable({ providedIn: 'root' })
export class CognitoAuthService {
  readonly logueadoCognito = signal(!!sessionStorage.getItem(K_ID));
  readonly claimsCognito = signal<CognitoClaims>(decodePayload(sessionStorage.getItem(K_ID)?.split('.')[1]));

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

  token(): string | null {
    return sessionStorage.getItem(K_ID);
  }

  async login(): Promise<void> {
    const verifier = randomVerifier();
    sessionStorage.setItem(K_VERIFIER, verifier);
    const challenge = await challengeOf(verifier);
    const params = new URLSearchParams({
      client_id: this.cfg.clientId,
      response_type: 'code',
      scope: this.cfg.scopes.join(' '),
      redirect_uri: this.cfg.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });
    window.location.href = `${this.cfg.domain}/login?${params.toString()}`;
  }

  async completarLogin(code: string): Promise<void> {
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
    sessionStorage.setItem(K_ID, json.id_token);
    sessionStorage.setItem(K_ACCESS, json.access_token);
    sessionStorage.removeItem(K_VERIFIER);
    this.logueadoCognito.set(true);
    this.claimsCognito.set(decodePayload(json.id_token.split('.')[1]));
  }

  logout(): void {
    sessionStorage.removeItem(K_ID);
    sessionStorage.removeItem(K_ACCESS);
    this.logueadoCognito.set(false);
    this.claimsCognito.set({});
    const params = new URLSearchParams({
      client_id: this.cfg.clientId,
      logout_uri: environment.azure.redirectUri,
    });
    window.location.href = `${this.cfg.domain}/logout?${params.toString()}`;
  }

  salirLocal(): void {
    sessionStorage.removeItem(K_ID);
    sessionStorage.removeItem(K_ACCESS);
    this.logueadoCognito.set(false);
    this.claimsCognito.set({});
  }
}
