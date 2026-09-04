import { Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../core/security/auth.service';
import { ProductoArte } from '../core/components/producto-arte/producto-arte';
import { Producto, formatPrecio } from '../core/models/producto';
import { CarritoService } from '../services/carrito.service';
import { ProductoService } from '../services/producto.service';

@Component({
  selector: 'app-home',
  imports: [ProductoArte],
  templateUrl: './home.html',
})
export class Home {
  private readonly productosService = inject(ProductoService);
  private readonly carrito = inject(CarritoService);
  private readonly auth = inject(AuthService);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly categorias = computed(() => [
    ...new Set(this.productos().map((p) => p.etiqueta)),
  ]);
  protected readonly precio = formatPrecio;

  constructor() {
    this.cargarCatalogo();
  }

  cargarCatalogo(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.productosService.getProductos().subscribe({
      next: (lista) => {
        this.productos.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      },
    });
  }

  agregar(producto: Producto): void {
    if (!this.auth.logueado()) {
      this.auth.login();
      return;
    }
    this.carrito.agregarItem(producto).subscribe({
      error: () => console.warn('[carrito] no se pudo agregar el producto'),
    });
  }
}