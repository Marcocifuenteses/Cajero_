import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Retiro } from './retiro';

describe('Retiro', () => {
  let component: Retiro;
  let fixture: ComponentFixture<Retiro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Retiro],
    }).compileComponents();

    fixture = TestBed.createComponent(Retiro);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
