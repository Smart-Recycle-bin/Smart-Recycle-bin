import { Component, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, Icon],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {
  readonly title = input<string>('Smart Recycling Platform');
  readonly subtitle = input<string>('Sign in to manage IoT smart bins and recycling operations');
  readonly appName = input<string>('SmartRecycle');
}
