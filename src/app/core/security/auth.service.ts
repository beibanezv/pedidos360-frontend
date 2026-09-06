import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { InteractionStatus } from '@azure/msal-browser';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { filter, firstValueFrom, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface TokenClaims {
  oid?: string;
  sub?: string;
  roles?: string[];
  scp?: string[] | string;
  [claim: string]: unknown;
}

/** Respuesta de GET /login/me (ms-login): el JWT decodificado en el backend. */
export interface UsuarioLogin {
  oid: string;
  nombre: string | null;
  correo: string | null;
  roles: string[];
  scopes: string[] | string;
}

/** Decodifica el payload de un JWT (parte [1]) sin librerías externas. */
function decodeJwtPayload(segment?: string): TokenClaims {
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
    return JSON.parse(utf8) as TokenClaims;
  } catch {
    return {};
  }
}

/**
 * Estado de sesión y claims del usuario.
 *
 * Los app roles de Azure (Cliente/Admin) y los scopes (Productos.Read,
 * Carrito.ReadWrite) vienen en el ACCESS token, no de forma fiable en el id_token:
 * por eso aquí se hace acquireTokenSilent y se decodifica el payload.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(MsalService);
  private readonly broadcast = inject(MsalBroadcastService);
  private readonly http = inject(HttpClient);

  readonly logueado = signal(this.auth.instance.getAllAccounts().length > 0);
  readonly claims = signal<TokenClaims>({});

  // SIMPLIFICADO: sesión local solo UI (demo). No es un login real: no emite
  // tokens ni desbloquea nada protegido (el carrito exige token de Azure).
  readonly usuarioLocal = signal<string | null>(sessionStorage.getItem('p360-local'));

  readonly roles = computed(() => this.claims().roles ?? []);
  readonly esCliente = computed(() => this.roles().includes('Cliente'));
  readonly esAdmin = computed(() => this.roles().includes('Admin'));
  readonly oid = computed(() => this.claims().oid ?? this.claims().sub);

  readonly scopes = computed(() => {
    const scp = this.claims().scp;
    if (Array.isArray(scp)) return scp;
    if (typeof scp === 'string') return scp.split(' ').filter(Boolean);
    return [];
  });

  readonly nombre = computed(() => {
    this.logueado();
    const acc = this.auth.instance.getAllAccounts()[0];
    return acc?.name || acc?.username || this.usuarioLocal() || 'Usuario';
  });

  constructor() {
    // Se suscribe de por vida (servicio raíz): no hace falta takeUntilDestroyed.
    // Este es el reemplazo standalone del <msal-redirect>: procesa la respuesta
    // del redirect al volver de Azure (ver AGENTS.md → SIMPLIFICADO).
    this.auth.handleRedirectObservable().subscribe();

    this.broadcast.inProgress$
      .pipe(filter((status) => status === InteractionStatus.None))
      .subscribe(() => this.sincronizar());
  }

  login(): void {
    this.auth.loginRedirect();
  }

  /**
   * Pide a ms-login que decodifique el JWT (el interceptor adjunta el token).
   * Demuestra que ms-login está en uso; si no responde, la cuenta sigue
   * funcionando con los claims locales.
   */
  perfilLogin(): Observable<UsuarioLogin> {
    const base = environment.useGateway ? environment.apiUrl : environment.loginUrl;
    return this.http.get<UsuarioLogin>(`${base}/login/me`);
  }

  /** Sesión local demo: solo abre la UI, no toca MSAL ni los guards. */
  loginLocal(nombre: string): void {
    const limpio = nombre.trim() || 'Invitado';
    sessionStorage.setItem('p360-local', limpio);
    this.usuarioLocal.set(limpio);
  }

  salirLocal(): void {
    sessionStorage.removeItem('p360-local');
    this.usuarioLocal.set(null);
  }

  logout(): void {
    // SIMPLIFICADO: pasar la cuenta activa evita el selector de cuentas de Azure
    // y vuelve directo al frontend.
    const cuenta =
      this.auth.instance.getActiveAccount() ?? this.auth.instance.getAllAccounts()[0];
    this.auth.logoutRedirect({
      account: cuenta,
      postLogoutRedirectUri: environment.azure.redirectUri,
    });
  }

  /** Recalcula sesión + claims (del access token) cuando cambia el estado MSAL. */
  async sincronizar(): Promise<void> {
    const account = this.auth.instance.getAllAccounts()[0];
    this.logueado.set(!!account);
    if (!account) {
      this.claims.set({});
      return;
    }
    this.auth.instance.setActiveAccount(account);
    try {
      const resultado = await firstValueFrom(
        this.auth.acquireTokenSilent({
          scopes: environment.azure.apiScopes,
          account,
        }),
      );
      this.claims.set(decodeJwtPayload(resultado.accessToken.split('.')[1]));
    } catch {
      // Sin consentimiento/red no alcanzable: caer al id_token (roles pueden faltar).
      this.claims.set({ ...decodeJwtPayload(account.idToken?.split('.')[1]), fuente: 'id_token' });
    }
  }

/**
   * Garantiza que los claims del access token estén cargados antes de decidir
   * por rol (lo usan guards con CanActivate funcional). Cae al id_token si
   * el silent no puede obtener el access token.
   */
  async asegurarClaims(): Promise<TokenClaims> {
    if (this.logueado() && Object.keys(this.claims()).length === 0) {
      await this.sincronizar();
    }
    return this.claims();
  }
}