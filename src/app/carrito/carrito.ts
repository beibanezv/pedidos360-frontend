import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Producto, formatPrecio } from '../core/models/producto';
import { ProductoArte } from '../core/components/producto-arte/producto-arte';
import {
  CarritoDTO,
  CarritoItemDTO,
  precioItem,
  totalCarrito,
} from '../core/models/carrito';
import { CarritoService } from '../services/carrito.service';
import { ProductoService } from '../services/producto.service';

interface ItemVista {
  item: CarritoItemDTO;
  producto: Producto | null;
}

@Component({
  selector: 'app-carrito',
  imports: [RouterLink, ProductoArte],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css',
})
export class Carrito {
  private readonly carritoService = inject(CarritoService);
  private readonly productoService = inject(ProductoService);

  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly carrito = signal<CarritoDTO | null>(null);
  protected readonly catalogo = signal<Map<string, Producto>>(new Map());

  protected readonly items = computed(() => this.carrito()?.items ?? []);
  protected readonly total = computed(() => totalCarrito(this.items()));

  /** Une cada ítem del carrito con su producto del catálogo (si todavía existe). */
  protected readonly itemsVista = computed<ItemVista[]>(() =>
    this.items().map((item) => ({
      item,
      producto: this.catalogo().get(item.productoId) ?? null,
    })),
  );

  protected readonly precio = formatPrecio;

  constructor() {
    this.cargar();
  }

  subtotal(item: CarritoItemDTO): number {
    return precioItem(item) * item.cantidad;
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      productos: this.productoService.getProductos(),
      carrito: this.carritoService.obtenerCarrito(),
    }).subscribe({
      next: ({ productos, carrito }) => {
        this.catalogo.set(new Map(productos.map((p) => [p.id, p])));
        this.carrito.set(carrito);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err.status ? `Error ${err.status} al cargar el carrito.` : 'No se pudo cargar el carrito.');
      },
    });
  }

  mas(item: CarritoItemDTO): void {
    this.cambiarCantidad(item, item.cantidad + 1);
  }

  menos(item: CarritoItemDTO): void {
    if (item.cantidad > 1) this.cambiarCantidad(item, item.cantidad - 1);
  }

  private cambiarCantidad(item: CarritoItemDTO, cantidad: number): void {
    this.carritoService.actualizarCantidad(item, cantidad).subscribe({
      next: () => this.cargar(),
      error: () => this.error.set('No se pudo actualizar la cantidad.'),
    });
  }

  eliminar(item: CarritoItemDTO): void {
    this.carritoService.eliminarItem(item).subscribe({
      next: () => this.cargar(),
      error: () => this.error.set('No se pudo eliminar el ítem.'),
    });
  }

  finalizarCompra(): void {
    this.carritoService.checkout().subscribe({
      next: (res) => {
        this.mensaje.set(`Compra completada: ${res.itemsComprados} ítems por ${this.precio(res.totalClp)}.`);
        this.cargar();
      },
      error: () => this.error.set('No se pudo completar la compra.'),
    });
  }
}