import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { formatPrecio } from '../core/models/producto';
import { PagoDTO, PagoService } from '../services/pago.service';

@Component({
  selector: 'app-resultado-pago',
  imports: [RouterLink],
  templateUrl: './resultado.html',
  styleUrl: './resultado.css',
})
export class Resultado {
  private readonly route = inject(ActivatedRoute);
  private readonly pagos = inject(PagoService);

  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly pago = signal<PagoDTO | null>(null);
  protected readonly precio = formatPrecio;

  private readonly ordenId = this.route.snapshot.queryParamMap.get('ordenId') ?? '';
  protected readonly puedeConsultar = !!this.ordenId;

  constructor() {
    // M10: el parámetro ?resultado= del retorno de WebPay NO se lee.
    // Un retorno repetido vuelve a consultar el estado persistido por el backend.
    this.consultar();
  }

  /** Única fuente de verdad: GET /pagos/{ordenId}. Reconsultar no afirma aprobación. */
  consultar(): void {
    if (!this.ordenId) {
      this.cargando.set(false);
      this.error.set(
        'No se recibió el número de orden del pago (por ejemplo, si abandonaste la pasarela). '
          + 'Revisa tus órdenes para ver el estado real; ningún pago se da por aprobado sin verificación.',
      );
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    this.pago.set(null);
    this.pagos.consultar(this.ordenId).subscribe({
      next: (pago) => {
        this.pago.set(pago);
        this.cargando.set(false);
      },
      error: (fallo: HttpErrorResponse) => {
        this.pago.set(null);
        this.cargando.set(false);
        this.error.set(fallo.status === 401 || fallo.status === 403
          ? 'Tu sesión venció o no tienes acceso. Vuelve a ingresar y consulta de nuevo.'
          : 'No pudimos verificar el pago con el servidor. La transacción podría estar aún en curso; '
            + 'vuelve a consultar en unos segundos.');
      },
    });
  }
}
