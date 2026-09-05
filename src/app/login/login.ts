import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../core/security/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
})
export class Login {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  entrarLocal(usuario: string, clave: string): void {
    if (!usuario.trim() || !clave) return;
    this.auth.loginLocal(usuario);
    this.router.navigate(['/']);
  }
}
