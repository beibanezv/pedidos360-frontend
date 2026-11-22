import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { formatPrecio } from '../core/models/producto';
import { OrdenDTO, cantidadItemsOrden } from '../core/models/orden';
import { OrdenService } from '../services/orden.service';
import { ExperienciaService, Pago } from '../services/experiencia.service';

interface EstadoPago {
  pago: Pago | null;
  ocupado: boolean;
  error: string;
}

@Component({
  selector: 'app-ordenes',
  imports: [RouterLink],
  templateUrl: './ordenes.html',
  styleUrls: ['../carrito/carrito.css', './ordenes.css'],
})
export class Ordenes {
  private readonly ordenService = inject(OrdenService);
  private readonly experiencia = inject(ExperienciaService);
  private readonly destroy = inject(DestroyRef);

  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly ordenes = signal<OrdenDTO[]>([]);
  protected readonly pagos = signal<Partial<Record<string, EstadoPago>>>({});

  protected readonly precio = formatPrecio;
  protected readonly itemsDe = cantidadItemsOrden;
  protected readonly numero = (id: string): string => (id ?? '').slice(0, 8);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.ordenService.misOrdenes().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (ordenes) => {
        this.ordenes.set(ordenes);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err.status === 401 ? 'Tu sesión venció. Vuelve a ingresar.' : 'No se pudieron cargar tus órdenes.');
      },
    });
  }

  cargarPago(id: string): void {
    if (this.pagos()[id]?.ocupado) return;
    this.registrarEstado(id, this.pagos()[id]?.pago ?? null, true);
    this.experiencia.ultimoPago(id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: pago => this.registrarEstado(id, pago),
      error: () => this.registrarEstado(id, null, false, 'No se pudo consultar el pago. Intenta de nuevo.'),
    });
  }

  pagar(id: string, tarjeta: string): void {
    const estado = this.pagos()[id];
    if (!estado || estado.ocupado || estado.error || estado.pago?.resultado === 'APROBADO' ||
        (tarjeta !== 'APROBACION' && tarjeta !== 'RECHAZO')) return;
    this.registrarEstado(id, estado.pago, true);
    this.experiencia.pagar(id, tarjeta).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: pago => this.registrarEstado(id, pago),
      error: () => this.registrarEstado(id, estado.pago, false, 'No se pudo confirmar el intento. Consulta el estado antes de volver a pagar.'),
    });
  }

  private registrarEstado(id: string, pago: Pago | null, ocupado = false, error = ''): void {
    this.pagos.update(anteriores => ({ ...anteriores, [id]: { pago, ocupado, error } }));
  }
}
