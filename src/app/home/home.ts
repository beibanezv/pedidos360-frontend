import { Component } from '@angular/core';

import { CATEGORIAS, PRODUCTOS_MOCK, formatPrecio } from '../data/productos.mock';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {
  protected readonly productos = PRODUCTOS_MOCK;
  protected readonly categorias = CATEGORIAS;
  protected readonly precio = formatPrecio;
}
