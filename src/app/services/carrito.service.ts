import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  CarritoDTO,
  CarritoItemDTO,
  CheckoutDTO,
  cantidadTotal,
} from '../core/models/carrito';
import { Producto } from '../core/models/producto';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly http = inject(HttpClient);
  // SIMPLIFICADO: HttpBackend inyectado como campo (en contexto de inyección);
  // llamar inject() dentro de un método lanza NG0203 en runtime.
  private readonly backend = inject(HttpBackend);

  private readonly totalItems = signal(0);

  /** Cantidad total de ítems, para el badge del navbar. */
  readonly count = this.totalItems.asReadonly();

  private get base(): string {
    return environment.useGateway ? environment.apiUrl : environment.carritoUrl;
  }

  obtenerCarrito(): Observable<CarritoDTO> {
    return this.http.get<CarritoDTO>(`${this.base}/carrito`).pipe(
      tap((carrito) => this.totalItems.set(cantidadTotal(carrito.items))),
    );
  }

  agregarItem(producto: Producto, cantidad = 1): Observable<CarritoItemDTO> {
    const body = { productoId: producto.id, cantidad, precioUnitarioClp: producto.precio };
    return this.http.post<CarritoItemDTO>(`${this.base}/carrito/items`, body).pipe(
      tap(() => this.totalItems.update((n) => n + cantidad)),
    );
  }

  /**
   * POST sin interceptores (sin Authorization): el backend responde 401 de verdad.
   * Se usa para mostrar el rechazo genuino en consola como evidencia de la demo.
   */
  agregarInvitado(producto: Producto, cantidad = 1): Observable<CarritoItemDTO> {
    const body = { productoId: producto.id, cantidad, precioUnitarioClp: producto.precio };
    const plano = new HttpClient(this.backend);
    return plano.post<CarritoItemDTO>(`${this.base}/carrito/items`, body);
  }

  actualizarCantidad(item: CarritoItemDTO, cantidad: number): Observable<CarritoItemDTO> {
    const body = { productoId: item.productoId, cantidad };
    return this.http.put<CarritoItemDTO>(`${this.base}/carrito/items/${item.id}`, body).pipe(
      tap(() => this.totalItems.update((n) => n - item.cantidad + cantidad)),
    );
  }

  eliminarItem(item: CarritoItemDTO): Observable<void> {
    return this.http.delete<void>(`${this.base}/carrito/items/${item.id}`).pipe(
      tap(() => this.totalItems.update((n) => Math.max(0, n - item.cantidad))),
    );
  }

  checkout(): Observable<CheckoutDTO> {
    return this.http.post<CheckoutDTO>(`${this.base}/carrito/checkout`, null).pipe(
      tap(() => this.totalItems.set(0)),
    );
  }
}