import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  readonly title = input<string>('Welcome back');
  readonly subtitle = input<string>('Sign in to the System Admin dashboard.');
  readonly logoSrc = input<string>('ecobin-logo.svg');
  readonly logoAlt = input<string>('EcoBin');
}
