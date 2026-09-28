import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { formatPrecio } from '../core/models/producto';
import { OrdenDTO, cantidadItemsOrden } from '../core/models/orden';
import { OrdenService } from '../services/orden.service';
import { AuthService } from '../core/security/auth.service';

@Component({
  selector: 'app-ordenes',
  imports: [RouterLink],
  templateUrl: './ordenes.html',
})
export class Ordenes {
  private readonly ordenService = inject(OrdenService);
  private readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly ordenes = signal<OrdenDTO[]>([]);

  protected readonly precio = formatPrecio;
  protected readonly itemsDe = cantidadItemsOrden;
  protected readonly numero = (id: string): string => id.slice(0, 8);

  protected readonly hayOrdenes = computed(() => this.ordenes().length > 0);

  constructor() {
    const oid = this.auth.oid();
    if (!oid) {
      this.cargando.set(false);
      this.error.set('No se pudo identificar tu sesión. Vuelve a ingresar.');
      return;
    }
    this.ordenService.misOrdenes(oid).subscribe({
      next: (ordenes) => {
        this.ordenes.set(ordenes);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err.status ? `Error ${err.status} al cargar tus órdenes.` : 'No se pudieron cargar tus órdenes.');
      },
    });
  }
}
