import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme/theme.service';
import { ToastContainer } from './shared/components/toast/toast-container/toast-container';

@Component({
  selector: 'app-root',
  imports: [ToastContainer, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly themeService = inject(ThemeService);

  constructor() {
    this.themeService.initializeTheme();
  }
}
