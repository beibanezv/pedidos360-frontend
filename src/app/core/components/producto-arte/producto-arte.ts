import { Component, Input } from '@angular/core';

import { ArteMock } from '../../models/producto';

@Component({
  selector: 'app-producto-arte',
  imports: [],
  templateUrl: './producto-arte.html',
})
export class ProductoArte {
  @Input() arte: ArteMock = 'cuadro';
  @Input() fondo = 'var(--panel-2)';
  @Input() acento = 'var(--copper)';
}
