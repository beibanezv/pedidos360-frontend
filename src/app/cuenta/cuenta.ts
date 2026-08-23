import { Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-cuenta',
  imports: [JsonPipe],
  template: `
    <main class="wrap">
      <section class="cuenta">
        <h1>Mi cuenta</h1>
        @if (!account) {
          <p class="lead">Sin sesión activa.</p>
        } @else {
          <p class="lead">{{ account.name || account.username }}</p>
          <table class="claims">
            <tbody>
              @for (claim of claims; track claim[0]) {
                <tr>
                  <th>{{ claim[0] }}</th>
                  <td>{{ claim[1] | json }}</td>
                </tr>
              }
            </tbody>
          </table>
          <p class="lead" style="margin-top: 24px;">
            Revisa los claims <code>roles</code> y <code>scp</code>: ahí deben llegar
            Cliente/Admin y los scopes Productos.Read / Carrito.ReadWrite desde Azure AD.
          </p>
        }
      </section>
    </main>
  `,
})
export class Cuenta {
  private readonly auth = inject(MsalService);

  protected readonly account = this.auth.instance.getAllAccounts()[0] ?? null;
  protected readonly claims = Object.entries(this.account?.idTokenClaims ?? {});
}
