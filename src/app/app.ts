import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterOutlet } from '@angular/router';
import { InteractionStatus } from '@azure/msal-browser';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly auth = inject(MsalService);
  private readonly msalBroadcast = inject(MsalBroadcastService);

  protected readonly loggedIn = signal(this.auth.instance.getAllAccounts().length > 0);

  constructor() {
    // SIMPLIFICADO: reemplaza <msal-redirect> de msal-angular (no exportado para apps
    // standalone). Mismo comportamiento: procesa la respuesta del redirect al volver.
    // Techo: si MSAL cambia su flujo de redirect, revisar docs de MsalRedirectComponent.
    this.auth.handleRedirectObservable().subscribe();

    this.msalBroadcast.inProgress$
      .pipe(
        filter((status) => status === InteractionStatus.None),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.loggedIn.set(this.auth.instance.getAllAccounts().length > 0);
      });
  }

  login(): void {
    this.auth.loginRedirect();
  }

  logout(): void {
    this.auth.logoutRedirect();
  }
}
