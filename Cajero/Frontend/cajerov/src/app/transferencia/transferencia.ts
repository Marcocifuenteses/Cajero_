import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AtmService } from '../atm.service';

@Component({
  standalone: true,
  selector: 'app-transferencia',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './transferencia.html',
  styleUrls: ['./transferencia.css'],
})
export class Transferencia implements OnInit {
  cuentas = signal<any[]>([]);
  cuentaOrigen = '';
  cuentaDestino = '';
  monto: number | null = null;
  mensaje = signal('');
  error = signal('');

  telefonoDestino = '';
  buscando = signal(false);
  resultadoBusqueda = signal<{ titular: string; cuentas: any[] } | null>(null);
  cuentaDestinoObj = signal<any | null>(null);
  confirmando = signal(false);
  cargando = signal(false);
  comprobante = signal<any | null>(null);

  private atm = inject(AtmService);
  private route = inject(ActivatedRoute);
  userName = this.atm.userName;

  get firstName() {
    const full = this.userName();
    return full ? full.split(' ')[0] : '';
  }

  ngOnInit() {
    const origen = this.route.snapshot.queryParamMap.get('origen');
    if (origen) this.cuentaOrigen = origen;
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

  async buscarDestinatario() {
    if (!this.telefonoDestino) return;
    this.error.set('');
    this.buscando.set(true);
    this.resultadoBusqueda.set(null);
    this.cuentaDestinoObj.set(null);
    this.cuentaDestino = '';

    try {
      const res = await this.atm.buscarCuentaPorTelefono(this.telefonoDestino);
      this.resultadoBusqueda.set(res);
      // Si solo tiene una cuenta, seleccionarla automáticamente
      if (res.cuentas.length === 1) {
        this.seleccionarCuentaDestino(res.cuentas[0]);
      }
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'No se encontró el destinatario');
    } finally {
      this.buscando.set(false);
    }
  }

  seleccionarCuentaDestino(cuenta: any) {
    this.cuentaDestinoObj.set(cuenta);
    this.cuentaDestino = String(cuenta.id);
    this.error.set('');
  }

  get cuentaOrigenObj() {
    return this.cuentas().find(c => String(c.id) === this.cuentaOrigen) || null;
  }

  solicitarConfirmacion() {
    this.error.set('');
    this.mensaje.set('');
    const origen = Number(this.cuentaOrigen);
    const destino = Number(this.cuentaDestino);
    const monto = Number(this.monto);
    if (!origen || !destino || monto <= 0) {
      this.error.set('Completa todos los campos con valores válidos');
      return;
    }
    this.confirmando.set(true);
  }

  cancelarConfirmacion() {
    this.confirmando.set(false);
  }

  async enviarTransferencia() {
    if (this.cargando()) return;
    this.error.set('');
    this.cargando.set(true);
    const origen = Number(this.cuentaOrigen);
    const destino = Number(this.cuentaDestino);
    const monto = Number(this.monto);
    try {
      await this.atm.transferencia(origen, destino, monto);
      this.confirmando.set(false);
      this.comprobante.set({
        desde: this.cuentaOrigenObj,
        para: this.resultadoBusqueda()?.titular,
        cuentaDestino: this.cuentaDestinoObj(),
        monto,
        fecha: new Date()
      });
      this.monto = null;
      this.loadCuentas();
    } catch (error: any) {
      this.confirmando.set(false);
      this.error.set(error?.error?.error || error?.message || 'Error al enviar la transferencia');
    } finally {
      this.cargando.set(false);
    }
  }
}
