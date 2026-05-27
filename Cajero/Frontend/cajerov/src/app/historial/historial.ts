import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AtmService } from '../atm.service';

@Component({
  standalone: true,
  selector: 'app-historial',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './historial.html',
  styleUrls: ['./historial.css'],
})
export class Historial implements OnInit {
  cuentas = signal<any[]>([]);
  cuentaSeleccionada = '';
  transacciones = signal<any[]>([]);
  error = signal('');
  cargando = signal(false);
  paginaActual = signal(1);
  totalPaginas = signal(1);
  totalRegistros = signal(0);

  private atm = inject(AtmService);
  private route = inject(ActivatedRoute);
  userName = this.atm.userName;

  get firstName() {
    const full = this.userName();
    return full ? full.split(' ')[0] : '';
  }

  esNegativo(t: any): boolean {
    const tipo = (t.tipo_transaccion || '').toLowerCase();
    return tipo === 'retiro' || tipo === 'transferencia_enviada';
  }

  numAuth(id: number): string {
    return '#' + String(id).padStart(6, '0');
  }

  ngOnInit() {
    this.loadCuentas();
  }

  async loadCuentas() {
    this.error.set('');
    try {
      this.cuentas.set(await this.atm.getCuentas());
      const cuentaParam = this.route.snapshot.queryParamMap.get('cuenta');
      if (cuentaParam) {
        this.cuentaSeleccionada = cuentaParam;
        await this.mostrarHistorial();
      }
    } catch (error: any) {
      this.error.set(error?.error?.error || error?.message || 'No se pudieron cargar las cuentas');
    }
  }

  async mostrarHistorial(pagina: number = 1) {
    this.error.set('');
    this.transacciones.set([]);
    const cuentaId = Number(this.cuentaSeleccionada);
    if (!cuentaId) { this.error.set('Seleccione una cuenta'); return; }
    this.cargando.set(true);
    try {
      const res = await this.atm.historial(cuentaId, pagina);
      this.transacciones.set(res.transacciones);
      this.paginaActual.set(res.page);
      this.totalPaginas.set(res.totalPages);
      this.totalRegistros.set(res.total);
    } catch (error: any) {
      this.error.set(error?.error?.error || error?.message || 'Error al cargar el historial');
    } finally {
      this.cargando.set(false);
    }
  }

  irAPagina(p: number) {
    if (p < 1 || p > this.totalPaginas()) return;
    this.mostrarHistorial(p);
  }
}
