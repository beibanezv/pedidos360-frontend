import { Component } from '@angular/core';

@Component({
  selector: 'app-admin',
  template: `
    <main class="wrap">
      <section class="cuenta">
        <h1>Panel de administración</h1>
        <p class="lead">
          Accesible solo para el rol <span class="role-chip admin">Admin</span>.
          Desde aquí se administraría el catálogo (ms-productos).
        </p>
      </section>
    </main>
  `,
})
export class Admin {}