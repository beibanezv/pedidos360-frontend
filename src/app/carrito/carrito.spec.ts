import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { Carrito } from './carrito';
import { CarritoService } from '../services/carrito.service';
import { ProductoService } from '../services/producto.service';
import { OrdenService } from '../services/orden.service';
import { AuthService } from '../core/security/auth.service';
import { CognitoAuthService } from '../core/security/cognito-auth.service';

const checkoutOk = {
  carritoId: 'c-1',
  usuarioId: 'u-1',
  itemsComprados: 1,
  totalClp: 18990,
  estado: 'checkout_ok',
  ordenId: 'o-1',
};

describe('Carrito (checkout C2)', () => {
  let checkout: jasmine.Spy;
  let consultar: jasmine.Spy;

  function configurar(consulta = NEVER): Carrito {
    TestBed.resetTestingModule();
    checkout = jasmine.createSpy('checkout').and.returnValue(of(checkoutOk));
    consultar = jasmine.createSpy('consultar').and.returnValue(consulta);
    TestBed.configureTestingModule({
      imports: [Carrito],
      providers: [
        provideRouter([]),
        {
          provide: CarritoService,
          useValue: {
            obtenerCarrito: () => of({ id: 'c-1', usuarioId: 'u-1', createdAt: '', items: [] }),
            checkout: checkout,
            actualizarCantidad: () => of(undefined),
            eliminarItem: () => of(undefined),
          },
        },
        { provide: ProductoService, useValue: { getProductos: () => of([]) } },
        { provide: OrdenService, useValue: { consultar: consultar } },
        {
          provide: AuthService,
          useValue: {
            asegurarClaims: () => Promise.resolve(),
            claims: () => ({ email: 'cliente@pedidos360.cl' }),
            logueado: () => true,
            nombre: () => 'Cliente',
            roles: () => [],
            perfiles: () => of(null),
            perfilLogin: () => of(null),
          },
        },
        { provide: CognitoAuthService, useValue: { logueadoCognito: () => false, claimsCognito: () => ({}) } },
      ],
    });
    const fixture = TestBed.createComponent(Carrito);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('un doble clic genera una sola orden mientras el registro está pendiente', async () => {
    const componente = configurar();

    await componente.finalizarCompra();
    await componente.finalizarCompra();

    expect(checkout).toHaveBeenCalledTimes(1);
    expect((componente as any).registrando()).toBeTrue();
    expect((componente as any).ordenId()).toBe('o-1');
  });

  it('un 409 por stock informa el problema sin vaciar la vista', async () => {
    TestBed.resetTestingModule();
    checkout = jasmine.createSpy('checkout').and.returnValue(throwError(() => ({ status: 409 })));
    TestBed.configureTestingModule({
      imports: [Carrito],
      providers: [
        provideRouter([]),
        {
          provide: CarritoService,
          useValue: {
            obtenerCarrito: () => of({ id: 'c-1', usuarioId: 'u-1', createdAt: '', items: [] }),
            checkout: checkout,
            actualizarCantidad: () => of(undefined),
            eliminarItem: () => of(undefined),
          },
        },
        { provide: ProductoService, useValue: { getProductos: () => of([]) } },
        { provide: OrdenService, useValue: { consultar: () => NEVER } },
        {
          provide: AuthService,
          useValue: {
            asegurarClaims: () => Promise.resolve(),
            claims: () => ({ email: 'cliente@pedidos360.cl' }),
            logueado: () => true,
            nombre: () => 'Cliente',
            roles: () => [],
            perfiles: () => of(null),
            perfilLogin: () => of(null),
          },
        },
        { provide: CognitoAuthService, useValue: { logueadoCognito: () => false, claimsCognito: () => ({}) } },
      ],
    });
    const fixture = TestBed.createComponent(Carrito);
    fixture.detectChanges();

    await fixture.componentInstance.finalizarCompra();

    expect((fixture.componentInstance as any).error()).toContain('stock');
    expect((fixture.componentInstance as any).registrando()).toBeFalse();
  });
});
