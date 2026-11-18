import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { safeReturnUrl } from '@core/guards/auth/return-url';
import { ApiError } from '@core/errors/api-error';
import { AuthError } from '@core/errors/auth-error';
import { isApiErrorCode } from '@core/errors/error-message';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { environment } from '@env/environment';
import { Input } from '@shared/components/form/input/input';
import { Button } from '@shared/components/button/button';
import { Notice } from '@shared/components/notice/notice';
import { Modal } from '@shared/components/overlay/modal/modal';
import { Icon } from '@shared/components/icon/icon';

declare const ngDevMode: boolean | undefined;

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    Input,
    Button,
    Notice,
    Modal,
    Icon,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /**
   * Prototype note display controlled by active environment configuration.
   * Gated by ngDevMode and useMockBackend so credentials are eliminated in production.
   */
  readonly isMockBackend: boolean;
  readonly prototypeErrorKeyword: string;
  readonly mockCredentials: { email: string; password: string } | null;

  /**
   * State signals for authentication request and error handling.
   */
  readonly isLoading = signal<boolean>(false);
  readonly invalidCredentials = signal<boolean>(false);
  readonly isSuspended = signal<boolean>(false);
  readonly isNotAdmin = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);
  readonly capsLockActive = signal<boolean>(false);
  readonly emailServerError = signal<string>('');
  readonly passwordServerError = signal<string>('');

  /**
   * Main login reactive form.
   */
  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  /**
   * State signals for 'Forgot password?' modal workflow.
   */
  readonly isForgotPasswordOpen = signal<boolean>(false);
  readonly isForgotLoading = signal<boolean>(false);
  readonly forgotSubmitted = signal<boolean>(false);
  readonly forgotEmailError = signal<string>('');

  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    if ((typeof ngDevMode === 'undefined' || ngDevMode) && environment.useMockBackend) {
      this.isMockBackend = true;
      this.prototypeErrorKeyword = 'wrongpass';
      this.mockCredentials = { email: 'admin@ecobin.eg', password: 'password123' };
    } else {
      this.isMockBackend = false;
      this.prototypeErrorKeyword = '';
      this.mockCredentials = null;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  checkCapsLock(event: KeyboardEvent): void {
    if (event && typeof event.getModifierState === 'function') {
      this.capsLockActive.set(event.getModifierState('CapsLock'));
    }
  }

  fillMockCredentials(): void {
    if (!this.mockCredentials) {
      return;
    }
    this.loginForm.setValue({
      email: this.mockCredentials.email,
      password: this.mockCredentials.password,
    });
    this.clearErrors();
  }

  submitLogin(): void {
    if (this.isLoading()) {
      return;
    }

    this.clearErrors();

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const credentials = this.loginForm.getRawValue();

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading.set(false);
        const rawReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const targetUrl = safeReturnUrl(rawReturnUrl) ?? '/overview';
        this.router.navigateByUrl(targetUrl);
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.handleLoginError(err);
      },
    });
  }

  private handleLoginError(err: unknown): void {
    if (err instanceof AuthError && err.code === 'NOT_ADMIN') {
      this.isNotAdmin.set(true);
      return;
    }

    if (isApiErrorCode(err, ApiErrorCode.InvalidCredentials)) {
      this.invalidCredentials.set(true);
      return;
    }

    if (isApiErrorCode(err, ApiErrorCode.AccountSuspended)) {
      this.isSuspended.set(true);
      return;
    }

    if (isApiErrorCode(err, ApiErrorCode.ValidationError)) {
      if (err instanceof ApiError && err.details && typeof err.details === 'object') {
        const details = err.details as Record<string, string>;
        if (details['email']) {
          this.loginForm.controls.email.setErrors({ serverError: details['email'] });
          this.emailServerError.set(details['email']);
        }
        if (details['password']) {
          this.loginForm.controls.password.setErrors({ serverError: details['password'] });
          this.passwordServerError.set(details['password']);
        }
      } else {
        const message = err instanceof ApiError ? err.message : 'Invalid input data';
        this.loginForm.controls.email.setErrors({ serverError: message });
        this.emailServerError.set(message);
      }
      return;
    }

    // Network errors, 5xx, and other unhandled HTTP errors are automatically toasted by errorInterceptor
  }

  clearErrors(): void {
    this.invalidCredentials.set(false);
    this.isSuspended.set(false);
    this.isNotAdmin.set(false);
    this.emailServerError.set('');
    this.passwordServerError.set('');
  }

  openForgotPassword(): void {
    this.forgotForm.reset();
    this.forgotEmailError.set('');
    this.forgotSubmitted.set(false);
    this.isForgotLoading.set(false);
    this.isForgotPasswordOpen.set(true);
  }

  closeForgotPassword(): void {
    this.isForgotPasswordOpen.set(false);
  }

  submitForgotPassword(): void {
    if (this.isForgotLoading()) {
      return;
    }

    this.forgotEmailError.set('');

    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isForgotLoading.set(true);
    const email = this.forgotForm.getRawValue().email;

    this.authService.forgotPassword({ email }).subscribe({
      next: () => {
        this.isForgotLoading.set(false);
        this.forgotSubmitted.set(true);
      },
      error: () => {
        // Neutral response to avoid email enumeration
        this.isForgotLoading.set(false);
        this.forgotSubmitted.set(true);
      },
    });
  }
}
