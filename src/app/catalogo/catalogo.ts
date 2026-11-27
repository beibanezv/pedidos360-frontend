import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../core/security/auth.service';
import { CognitoAuthService } from '../core/security/cognito-auth.service';
import { ProductoArte } from '../core/components/producto-arte/producto-arte';
import { Producto, formatPrecio } from '../core/models/producto';
import { CarritoService } from '../services/carrito.service';
import { ProductoService } from '../services/producto.service';
import { ExperienciaService } from '../services/experiencia.service';

@Component({
  selector: 'app-catalogo',
  imports: [ProductoArte],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo {
  private readonly productosService = inject(ProductoService);
  private readonly carrito = inject(CarritoService);
  private readonly auth = inject(AuthService);
  private readonly cognito = inject(CognitoAuthService);
  private readonly router = inject(Router);
  private readonly experiencia = inject(ExperienciaService);
  private readonly destroy = inject(DestroyRef);
  private consultaDetalle?: Subscription;

  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly errorMensaje = signal('');
  protected readonly precio = formatPrecio;
  protected readonly detalle = signal<Producto | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly detalleError = signal(false);
  protected readonly enSesion = computed(() => this.auth.logueado() || this.cognito.logueadoCognito());
  protected readonly recomendados = signal<Producto[]>([]);
  protected readonly estadoRecomendados = signal<'cargando' | 'listo' | 'error'>('cargando');
  private readonly revision = signal(0);

  constructor() {
    this.cargarCatalogo();
    effect(onCleanup => {
      this.revision();
      if (!this.enSesion()) {
        this.recomendados.set([]);
        return;
      }
      this.estadoRecomendados.set('cargando');
      const consulta = this.experiencia.recomendaciones().subscribe({
        next: productos => {
          this.recomendados.set(productos);
          this.estadoRecomendados.set('listo');
        },
        error: () => this.estadoRecomendados.set('error'),
      });
      onCleanup(() => consulta.unsubscribe());
    });
  }

  actualizarRecomendaciones(): void {
    this.revision.update(n => n + 1);
  }

  abrirDetalle(producto: Producto, dialogo: HTMLDialogElement): void {
    this.consultaDetalle?.unsubscribe();
    this.detalle.set(producto);
    this.detalleError.set(false);
    this.cargandoDetalle.set(true);
    dialogo.showModal();
    this.consultaDetalle = this.productosService.getDetalle(producto.id)
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: recibido => {
          this.detalle.set(recibido);
          this.cargandoDetalle.set(false);
        },
        error: () => {
          this.detalleError.set(true);
          this.cargandoDetalle.set(false);
        },
      });
  }

  cargarCatalogo(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.productosService.getProductos().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (lista) => {
        this.productos.set(lista);
        this.cargando.set(false);
      },
      error: (fallo) => {
        this.error.set(true);
        this.errorMensaje.set(
          fallo.status === 503
            ? 'El catálogo no está disponible en este momento (503). Inténtalo nuevamente.'
            : 'No se pudo cargar el catálogo. Revisa tu conexión e inténtalo nuevamente.',
        );
        this.cargando.set(false);
      },
    });
  }

  agregar(producto: Producto): void {
    // Cualquiera de las dos sesiones vale: el interceptor adjunta el token
    // que corresponda. Antes solo se miraba la sesión Azure y con Cognito se
    // disparaba el POST de invitado (401) y el redirect a /login.
    if (!this.auth.logueado() && !this.cognito.logueadoCognito()) {
      // Sin sesión: el POST sale sin token y el backend responde 401 genuino,
      // que queda visible en consola como evidencia; luego se redirige a /login.
      this.carrito.agregarInvitado(producto).subscribe({
        next: () => this.router.navigate(['/login']),
        error: (err) => {
          console.error('[carrito] no se pudo agregar el producto', err);
          this.router.navigate(['/login']);
        },
      });
      return;
    }
    this.carrito.agregarItem(producto).subscribe({
      error: () => console.warn('[carrito] no se pudo agregar el producto'),
    });
  }
}
