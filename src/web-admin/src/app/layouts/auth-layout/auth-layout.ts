import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '@services/theme/theme.service';
import { Icon } from '@shared/components/icon/icon';
import { TooltipDirective } from '@shared/components/tooltip/tooltip.directive';
import { BrandLogo } from '@shared/components/brand-logo/brand-logo';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, Icon, TooltipDirective, BrandLogo],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  private readonly themeService = inject(ThemeService);

  readonly title = input<string>('Welcome back');
  readonly subtitle = input<string>('Sign in to the System Admin dashboard.');
  readonly logoSrc = input<string>('brand/ecobin-logo.svg');
  readonly logoAlt = input<string>('EcoBin');

  readonly isDark = this.themeService.isDark;

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
