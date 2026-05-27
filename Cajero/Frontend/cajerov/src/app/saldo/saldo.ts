import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AtmService } from '../atm.service';

@Component({
  standalone: true,
  selector: 'app-saldo',
  imports: [CommonModule, RouterModule],
  templateUrl: './saldo.html',
  styleUrls: ['./saldo.css'],
})
export class Saldo implements OnInit {
  cuentas = signal<any[]>([]);
  error = signal('');
  cargando = signal(true);

  private atm = inject(AtmService);
  userName = this.atm.userName;

  get firstName() {
    const full = this.userName();
    return full ? full.split(' ')[0] : '';
  }

  get totalSaldo() {
    return this.cuentas().reduce((sum, c) => sum + parseFloat(c.saldo || 0), 0);
  }

  async ngOnInit() {
    try {
      this.cuentas.set(await this.atm.getCuentas());
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'No se pudieron cargar las cuentas');
    } finally {
      this.cargando.set(false);
    }
  }
}