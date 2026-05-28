import { Component, signal, inject } from '@angular/core';
import { AtmService } from './atm.service';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('Banco Cajero');
  private atm = inject(AtmService);

  countdown = this.atm.idleCountdown;

  get firstName() {
    const full = this.atm.userName();
    return full ? full.split(' ')[0] : '';
  }

  // stroke-dashoffset: 0 = anillo lleno (20s), 100 = vacío (0s)
  get ringOffset(): number {
    const c = this.countdown();
    if (c === null) return 100;
    return ((20 - c) / 20) * 100;
  }
}
