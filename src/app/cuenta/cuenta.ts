import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';

import { AuthService, UsuarioLogin } from '../core/security/auth.service';
import { CognitoAuthService } from '../core/security/cognito-auth.service';

@Component({
  selector: 'app-cuenta',
  imports: [JsonPipe],
  template: `
    <main class="wrap">
      <section class="cuenta">
        <h1>Mi cuenta</h1>
        @if (!enSesion()) {
          <p class="lead">Sin sesión activa.</p>
        } @else {
          <p class="lead">{{ nombreSesion() }}</p>
          <p class="lead">Proveedor: {{ esCognito() ? 'Cognito' : 'Microsoft (Azure AD)' }}</p>

          @if (esAzure()) {
            @if (auth.roles().length > 0) {
              <div class="roles">
                @for (rol of auth.roles(); track rol) {
                  <span class="role-chip" [class.admin]="rol === 'Admin'">{{ rol }}</span>
                }
              </div>
            } @else {
              <p class="lead">Sin app roles asignados (Cliente / Admin) en Azure.</p>
            }

            <p class="lead" style="margin-top: 24px;">
              Scopes del token: {{ auth.scopes().length > 0 ? auth.scopes().join(', ') : '—' }}
            </p>
          } @else {
            <p class="lead">Sesión Cognito válida (JWT del User Pool). Cognito no usa roles ni scopes de Azure: el authorizer del Gateway la acepta como comprador.</p>
          }

          @if (esAzure()) {
            <h2 style="margin-top: 24px;">Datos desde ms-login</h2>
            @if (perfil()) {
              <table class="claims">
                <tbody>
                  <tr><th>oid</th><td>{{ perfil()!.oid }}</td></tr>
                  <tr><th>nombre</th><td>{{ perfil()!.nombre }}</td></tr>
                  <tr><th>correo</th><td>{{ perfil()!.correo }}</td></tr>
                  <tr><th>roles</th><td>{{ perfil()!.roles | json }}</td></tr>
                  <tr><th>scopes</th><td>{{ perfil()!.scopes | json }}</td></tr>
                </tbody>
              </table>
            } @else if (errorPerfil()) {
              <p class="lead">ms-login no alcanzable (GET /login/me falló).</p>
            } @else {
              <p class="lead">Consultando a ms-login…</p>
            }
          } @else {
            <h2 style="margin-top: 24px;">Datos desde ms-login</h2>
            <p class="lead">ms-login solo decodifica JWT de Azure; con sesión Cognito no aplica. La validez del token Cognito está probada en el Gateway (matriz 401/403/200).</p>
          }

          <table class="claims">
            <tbody>
              @for (claim of claims(); track claim[0]) {
                <tr>
                  <th>{{ claim[0] }}</th>
                  <td>{{ claim[1] | json }}</td>
                </tr>
              }
            </tbody>
          </table>
          <p class="lead" style="margin-top: 24px;">
            @if (esAzure()) {
              Revisa <code>roles</code> y <code>scp</code>: ahí deben llegar Cliente/Admin
              y Productos.Read / Carrito.ReadWrite desde Azure AD.
            } @else {
              Revisa <code>sub</code>, <code>email</code> e <code>iss</code>: es el JWT de Cognito
              (<code>https://cognito-idp.us-east-1.amazonaws.com/us-east-1_AU4jqskhP</code>).
            }
          </p>
        }
      </section>
    </main>
  `,
})
export class Cuenta implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly cognito = inject(CognitoAuthService);
  protected readonly claims = computed(() =>
    this.auth.logueado() ? Object.entries(this.auth.claims()) : Object.entries(this.cognito.claimsCognito()),
  );
  protected readonly enSesion = computed(() => this.auth.logueado() || this.cognito.logueadoCognito());
  protected readonly esAzure = computed(() => this.auth.logueado());
  protected readonly esCognito = computed(() => !this.auth.logueado() && this.cognito.logueadoCognito());
  protected readonly nombreSesion = computed(() =>
    this.auth.logueado() ? this.auth.nombre() : this.cognito.nombreCognito(),
  );
  protected readonly perfil = signal<UsuarioLogin | null>(null);
  protected readonly errorPerfil = signal(false);

  ngOnInit(): void {
    if (this.auth.logueado()) {
      this.auth.perfilLogin().subscribe({
        next: (p) => this.perfil.set(p),
        error: () => this.errorPerfil.set(true),
      });
    }
  }
}