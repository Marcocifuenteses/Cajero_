import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cuenta } from './cuenta';

describe('Cuenta', () => {
  let component: Cuenta;
  let fixture: ComponentFixture<Cuenta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cuenta],
    }).compileComponents();

    fixture = TestBed.createComponent(Cuenta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
