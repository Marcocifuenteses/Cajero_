import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AtmService } from '../atm.service';

@Component({
  standalone: true,
  selector: 'app-retiro',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './retiro.html',
  styleUrls: ['./retiro.css'],
})
export class Retiro implements OnInit {
  cuentas = signal<any[]>([]);
  cuentaSeleccionada = '';
  monto: number | null = null;
  mensaje = signal('');
  error = signal('');
  confirmando = signal(false);
  cargando = signal(false);
  comprobante = signal<any | null>(null);

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

  setAmount(value: number) {
    this.monto = value;
  }

  get cuentaSeleccionadaObj() {
    return this.cuentas().find(c => String(c.id) === this.cuentaSeleccionada) || null;
  }

  solicitarConfirmacion() {
    this.error.set('');
    this.mensaje.set('');
    const cuentaId = Number(this.cuentaSeleccionada);
    const monto = Number(this.monto);
    if (!cuentaId || monto <= 0) {
      this.error.set('Seleccione cuenta y monto válido');
      return;
    }
    this.confirmando.set(true);
  }

  cancelarConfirmacion() {
    this.confirmando.set(false);
  }

  async enviarRetiro() {
    if (this.cargando()) return;
    this.error.set('');
    this.cargando.set(true);
    const cuentaId = Number(this.cuentaSeleccionada);
    const monto = Number(this.monto);
    try {
      const response = await this.atm.retiro(cuentaId, monto);
      this.confirmando.set(false);
      this.comprobante.set({
        tipo: 'Retiro',
        cuenta: this.cuentaSeleccionadaObj,
        monto,
        saldo_nuevo: response.saldo_actual,
        fecha: new Date()
      });
      this.monto = null;
      this.loadCuentas();
    } catch (error: any) {
      this.confirmando.set(false);
      this.error.set(error?.error?.error || error?.message || 'Error al realizar el retiro');
    } finally {
      this.cargando.set(false);
    }
  }
}
