import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AtmService } from '../atm.service';

@Component({
  standalone: true,
  selector: 'app-cuenta',
  imports: [CommonModule, RouterModule],
  templateUrl: './cuenta.html',
  styleUrls: ['./cuenta.css'],
})
export class Cuenta implements OnInit {
  cuentas = signal<any[]>([]);
  error = signal('');

  private atm = inject(AtmService);
  userName = this.atm.userName;

  get firstName() {
    const full = this.userName();
    return full ? full.split(' ')[0] : '';
  }

  ngOnInit() {
    this.loadCuentas();
  }

  async loadCuentas() {
    this.error.set('');
    try {
      this.cuentas.set(await this.atm.getCuentas());
    } catch (error: any) {
      this.error.set(error?.error?.error || error?.message || 'No se pudieron cargar las cuentas');
    }
  }
}
