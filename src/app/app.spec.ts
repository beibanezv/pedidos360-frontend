import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY } from 'rxjs';
import { MSAL_INSTANCE, MsalBroadcastService, MsalService } from '@azure/msal-angular';

import { App } from './app';

// Stub hermético: evita red real hacia Azure mientras clientId sea placeholder.
const msalInstanceStub = {
  getAllAccounts: () => [],
  handleRedirectObservable: () => EMPTY,
  initializeWrapperLibrary: () => Promise.resolve(),
  initialize: () => Promise.resolve(),
  addEventCallback: () => null,
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: MSAL_INSTANCE, useValue: msalInstanceStub },
        MsalService,
        MsalBroadcastService,
      ],
    }).compileComponents();
  });

  it('debería crearse la app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra la marca y el botón de ingreso sin sesión', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('Pedidos360');
    expect(compiled.textContent).toContain('Ingresar');
  });
});
