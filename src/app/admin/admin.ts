import { Component, OnInit, inject, signal } from '@angular/core';

import { Categoria, Producto } from '../core/models/producto';
import { ProductoService } from '../services/producto.service';

@Component({
  selector: 'app-admin',
  template: `
    <main class="wrap">
      <section class="cuenta">
        <h1>Panel de administración</h1>
        <p class="lead">
          Accesible solo para el rol <span class="role-chip admin">Admin</span>.
          Crear y eliminar productos consume ms-productos con tu token (POST/DELETE).
        </p>
        @if (mensaje()) {
          <p class="lead">{{ mensaje() }}</p>
        }
        <h2>Agregar producto</h2>
        <form class="login-form" (submit)="$event.preventDefault(); crear(nombre.value, artista.value, categoria.value, precio.value, stock.value, descripcion.value)">
          <label class="campo">
            <span>Nombre</span>
            <input #nombre name="nombre" type="text" autocomplete="off" />
          </label>
          <label class="campo">
            <span>Artista o marca</span>
            <input #artista name="artista" type="text" autocomplete="off" />
          </label>
          <label class="campo">
            <span>Categoría</span>
            <select #categoria name="categoria">
              @for (c of categorias; track c) {
                <option [value]="c">{{ c }}</option>
              }
            </select>
          </label>
          <label class="campo">
            <span>Precio CLP</span>
            <input #precio name="precio" type="number" min="0" step="1" />
          </label>
          <label class="campo">
            <span>Stock</span>
            <input #stock name="stock" type="number" min="0" step="1" />
          </label>
          <label class="campo">
            <span>Descripción (opcional)</span>
            <input #descripcion name="descripcion" type="text" autocomplete="off" />
          </label>
          <button class="btn-primary" type="submit">Crear producto</button>
        </form>
        <h2>Catálogo actual ({{ lista().length }})</h2>
        @for (p of lista(); track p.id) {
          <div class="row">
            <span>{{ p.titulo }} — {{ p.artista }} (stock: {{ p.stock }})</span>
            <button class="btn-ghost" type="button" (click)="eliminar(p.id)">Eliminar</button>
          </div>
        }
      </section>
    </main>
  `,
})
export class Admin implements OnInit {
  private readonly productos = inject(ProductoService);

  protected readonly lista = signal<Producto[]>([]);
  protected readonly mensaje = signal('');
  protected readonly categorias: Categoria[] = ['vinilo', 'tornamesa', 'audifono', 'amplificador'];

  ngOnInit(): void {
    this.recargar();
  }

  recargar(): void {
    this.productos.getProductos().subscribe({
      next: (items) => this.lista.set(items),
      error: () => this.mensaje.set('No se pudo cargar el catálogo.'),
    });
  }

  crear(nombre: string, artista: string, categoria: string, precio: string, stock: string, descripcion: string): void {
    const precioClp = Number.parseInt(precio, 10);
    const stockNum = Number.parseInt(stock, 10);
    if (!nombre.trim() || !artista.trim() || !categoria || Number.isNaN(precioClp) || precioClp < 0 || Number.isNaN(stockNum) || stockNum < 0) {
      this.mensaje.set('Revisa los campos: nombre, artista, precio y stock son obligatorios.');
      return;
    }
    this.productos
      .crear({ nombre: nombre.trim(), artistaOMarca: artista.trim(), categoria: categoria as Categoria, precioClp, stock: stockNum, descripcion: descripcion.trim() || undefined })
      .subscribe({
        next: () => {
          this.mensaje.set('Producto creado.');
          this.recargar();
        },
        error: (err) => this.mensaje.set('No se pudo crear (¿sesión Admin vigente?): ' + (err?.status ?? '')),
      });
  }

  eliminar(id: string): void {
    this.productos.eliminar(id).subscribe({
      next: () => {
        this.mensaje.set('Producto eliminado.');
        this.recargar();
      },
      error: (err) => this.mensaje.set('No se pudo eliminar: ' + (err?.status ?? '')),
    });
  }
}