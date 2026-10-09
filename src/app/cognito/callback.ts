import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CognitoAuthService } from '../core/security/cognito-auth.service';

@Component({
  selector: 'app-cognito-callback',
  template: `
    <main class="wrap">
      <p class="lead">{{ mensaje() }}</p>
    </main>
  `,
})
export class CognitoCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cognito = inject(CognitoAuthService);
  protected readonly mensaje = signal('Completando login con Cognito…');

  async ngOnInit(): Promise<void> {
    const code = this.route.snapshot.queryParamMap.get('code');
    const error = this.route.snapshot.queryParamMap.get('error');
    if (error) {
      this.mensaje.set(`Cognito devolvió error: ${error}`);
      return;
    }
    if (!code) {
      this.mensaje.set('Sin código de autorización.');
      return;
    }
    try {
      await this.cognito.completarLogin(code);
      this.router.navigate(['/cuenta']);
    } catch {
      this.mensaje.set('No se pudo canjear el código (revisa redirect URI y PKCE).');
    }
  }
}
