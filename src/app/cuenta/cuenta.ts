import { Component, computed, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';

import { AuthService } from '../core/security/auth.service';

@Component({
  selector: 'app-cuenta',
  imports: [JsonPipe],
  template: `
    <main class="wrap">
      <section class="cuenta">
        <h1>Mi cuenta</h1>
        @if (!auth.logueado()) {
          <p class="lead">Sin sesión activa.</p>
        } @else {
          <p class="lead">{{ auth.nombre() }}</p>

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
            Revisa <code>roles</code> y <code>scp</code>: ahí deben llegar Cliente/Admin
            y Productos.Read / Carrito.ReadWrite desde Azure AD.
          </p>
        }
      </section>
    </main>
  `,
})
export class Cuenta {
  protected readonly auth = inject(AuthService);
  protected readonly claims = computed(() => Object.entries(this.auth.claims()));
}