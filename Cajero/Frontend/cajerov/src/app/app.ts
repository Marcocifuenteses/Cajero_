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

  get firstName() {
    const full = this.atm.userName();
    return full ? full.split(' ')[0] : '';
  }
}
