import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

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

  constructor() {
    const ordenId = this.route.snapshot.queryParamMap.get('ordenId');
    if (!ordenId) {
      this.cargando.set(false);
      this.error.set('No se recibió el número de orden del pago.');
      return;
    }
    this.pagos.consultar(ordenId).subscribe({
      next: (pago) => {
        this.pago.set(pago);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo verificar el pago con el servidor.');
        this.cargando.set(false);
      },
    });
  }
}
