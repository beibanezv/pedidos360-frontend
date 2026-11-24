import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { formatPrecio } from '../core/models/producto';
import { PagoService } from '../services/pago.service';

@Component({
  selector: 'app-pago',
  imports: [RouterLink],
  templateUrl: './pago.html',
  styleUrl: './pago.css',
})
export class Pago {
  private readonly route = inject(ActivatedRoute);
  private readonly pagos = inject(PagoService);

  protected readonly ordenId = signal(this.route.snapshot.paramMap.get('ordenId') ?? '');
  protected readonly total = signal(Number(this.route.snapshot.queryParamMap.get('total') ?? 0));
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly precio = formatPrecio;

  iniciar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.pagos.iniciar(this.ordenId()).subscribe({
      next: ({ url, token }) => this.redirigir(url, token),
      error: (fallo: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(fallo.status === 429
          ? 'Demasiados intentos de pago. Espera unos segundos antes de volver a intentar.'
          : 'No se pudo conectar con WebPay. Inténtalo nuevamente.');
      },
    });
  }

  /** Transbank espera un POST de formulario con token_ws, no un fetch. */
  private redirigir(url: string, token: string): void {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    const campo = document.createElement('input');
    campo.type = 'hidden';
    campo.name = 'token_ws';
    campo.value = token;
    form.appendChild(campo);
    document.body.appendChild(form);
    form.submit();
  }
}
