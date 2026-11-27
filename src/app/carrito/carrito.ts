import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, retry } from 'rxjs';

import { Producto, formatPrecio } from '../core/models/producto';
import { ProductoArte } from '../core/components/producto-arte/producto-arte';
import {
  CarritoDTO,
  CarritoItemDTO,
  precioItem,
  totalCarrito,
} from '../core/models/carrito';
import { CarritoService } from '../services/carrito.service';
import { OrdenService } from '../services/orden.service';
import { ProductoService } from '../services/producto.service';
import { AuthService } from '../core/security/auth.service';
import { CognitoAuthService } from '../core/security/cognito-auth.service';

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
  private readonly ordenes = inject(OrdenService);
  private readonly auth = inject(AuthService);
  private readonly cognito = inject(CognitoAuthService);

  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly carrito = signal<CarritoDTO | null>(null);
  protected readonly catalogo = signal<Map<string, Producto>>(new Map());
  // Las cuentas corporativas de Azure no siempre traen email en el token:
  // en ese caso se lo pedimos al comprador antes de finalizar.
  protected readonly pideEmail = signal(false);
  protected readonly emailCompra = signal('');
  // Datos de la orden recién creada, para ofrecer el pago con WebPay.
  protected readonly ordenId = signal('');
  protected readonly totalPago = signal(0);
  // C2: una clave por operación, conservada ante un resultado incierto.
  private readonly claveCheckout = signal<string | null>(null);
  protected readonly registrando = signal(false);
  protected readonly errorRegistro = signal('');

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

  async finalizarCompra(): Promise<void> {
    if (this.registrando()) return;
    await this.auth.asegurarClaims();
    if (this.emailDelToken()) {
      this.enviarCheckout();
    } else {
      this.pideEmail.set(true);
    }
  }

  confirmarConEmail(): void {
    const email = this.emailCompra().trim();
    if (!/.+@.+\..+/.test(email)) {
      this.error.set('Escribe un correo válido para enviarte la confirmación.');
      return;
    }
    this.pideEmail.set(false);
    this.enviarCheckout(email);
  }

  reintentarRegistro(): void {
    if (this.ordenId()) this.esperarOrden(this.ordenId());
  }

  private emailDelToken(): string | null {
    if (this.cognito.logueadoCognito()) {
      return this.cognito.claimsCognito().email ?? null;
    }
    const mail = this.auth.claims()['email'] ?? this.auth.claims()['preferred_username'];
    return typeof mail === 'string' && mail ? mail : null;
  }

  private enviarCheckout(email?: string): void {
    if (this.registrando()) return;
    // Si el resultado fue incierto se conserva la misma clave para el reintento.
    if (!this.claveCheckout()) this.claveCheckout.set(crypto.randomUUID());
    this.registrando.set(true);
    this.error.set('');
    this.errorRegistro.set('');

    this.carritoService.checkout(email, this.claveCheckout() ?? undefined).subscribe({
      next: (res) => {
        this.claveCheckout.set(null);
        const orden = res.ordenId ? ` Orden N° ${res.ordenId.slice(0, 8)}.` : '';
        this.mensaje.set(`Compra completada: ${res.itemsComprados} ${res.itemsComprados === 1 ? 'ítem' : 'ítems'} por ${this.precio(res.totalClp)}.${orden}`);
        this.ordenId.set(res.ordenId ?? '');
        this.totalPago.set(res.totalClp);
        this.cargar();
        if (res.ordenId) this.esperarOrden(res.ordenId);
        else this.registrando.set(false);
      },
      error: (fallo) => {
        this.registrando.set(false);
        if (fallo.status === 409) {
          this.claveCheckout.set(null);
          this.error.set('No hay stock suficiente para completar la compra. Tu carrito se conserva.');
        } else if (fallo.status === 400) {
          this.claveCheckout.set(null);
          this.error.set('No se pudo completar la compra.');
        } else {
          this.error.set('No pudimos confirmar la compra. Puedes reintentar sin generar otra orden.');
        }
      },
    });
  }

  /** Consulta acotada: la orden puede tardar en publicarse por RabbitMQ. */
  private esperarOrden(ordenId: string): void {
    this.registrando.set(true);
    this.errorRegistro.set('');
    this.ordenes.consultar(ordenId).pipe(retry({ count: 4, delay: 800 })).subscribe({
      next: () => {
        this.registrando.set(false);
        this.mensaje.update((texto) => `${texto} Orden registrada, ya puedes pagar.`);
      },
      error: () => {
        this.registrando.set(false);
        this.errorRegistro.set('La orden se está registrando. Puedes consultar nuevamente.');
      },
    });
  }
}