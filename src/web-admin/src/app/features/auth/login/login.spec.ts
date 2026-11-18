import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Login } from './login';
import { AuthService } from '@services/auth/auth.service';
import { ApiError } from '@core/errors/api-error';
import { AuthError } from '@core/errors/auth-error';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { UserRole } from '@models/user/user-role.enum';
import { LoginResponse } from '@models/auth/auth.dto';
import { environment } from '@env/environment';

describe('Login Component', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authServiceSpy: {
    login: ReturnType<typeof vi.fn>;
    forgotPassword: ReturnType<typeof vi.fn>;
  };
  let router: Router;
  let mockQueryParams: Record<string, string>;

  const mockAdminResponse: LoginResponse = {
    accessToken: 'access-tok',
    expiresIn: 900,
    refreshToken: 'refresh-tok',
    user: {
      userId: 'ADM-01',
      displayName: 'Admin User',
      role: UserRole.Admin,
    },
  };

  beforeEach(async () => {
    mockQueryParams = {};

    authServiceSpy = {
      login: vi.fn().mockReturnValue(of(mockAdminResponse)),
      forgotPassword: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => mockQueryParams[key] ?? null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockImplementation(() => Promise.resolve(true));

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should initialize with an empty form and clean error states', () => {
    expect(component).toBeTruthy();
    expect(component.loginForm.value).toEqual({ email: '', password: '' });
    expect(component.loginForm.valid).toBe(false);
    expect(component.isLoading()).toBe(false);
    expect(component.invalidCredentials()).toBe(false);
    expect(component.isSuspended()).toBe(false);
    expect(component.isNotAdmin()).toBe(false);
  });

  it('should not call AuthService.login when form is invalid', () => {
    component.submitLogin();

    expect(authServiceSpy.login).not.toHaveBeenCalled();
    expect(component.loginForm.controls.email.touched).toBe(true);
    expect(component.loginForm.controls.password.touched).toBe(true);
  });

  it('should submit valid credentials and navigate to /overview by default', () => {
    component.loginForm.setValue({
      email: 'admin@ecobin.org',
      password: 'password123',
    });

    component.submitLogin();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'admin@ecobin.org',
      password: 'password123',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/overview');
  });

  it('should sanitize returnUrl and navigate to valid internal relative route', () => {
    mockQueryParams['returnUrl'] = '/bins';

    component.loginForm.setValue({
      email: 'admin@ecobin.org',
      password: 'password123',
    });

    component.submitLogin();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/bins');
  });

  it('should sanitize unsafe returnUrl and fall back to /overview', () => {
    mockQueryParams['returnUrl'] = '//evil.com/phish';

    component.loginForm.setValue({
      email: 'admin@ecobin.org',
      password: 'password123',
    });

    component.submitLogin();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/overview');
  });

  it('should sanitize external absolute returnUrl and fall back to /overview', () => {
    mockQueryParams['returnUrl'] = 'https://attacker.org';

    component.loginForm.setValue({
      email: 'admin@ecobin.org',
      password: 'password123',
    });

    component.submitLogin();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/overview');
  });

  it('should render inline error banner on INVALID_CREDENTIALS error', () => {
    const error = new ApiError({
      status: 401,
      code: ApiErrorCode.InvalidCredentials,
      message: 'Invalid credentials',
      requestUrl: '/api/v1/auth/login',
    });
    authServiceSpy.login.mockReturnValue(throwError(() => error));

    component.loginForm.setValue({
      email: 'admin@ecobin.org',
      password: 'wrongpassword',
    });

    component.submitLogin();
    fixture.detectChanges();

    expect(component.invalidCredentials()).toBe(true);
    expect(component.isLoading()).toBe(false);

    const el = fixture.nativeElement as HTMLElement;
    const banner = el.querySelector('.login-error-banner');
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain('Invalid email or password');
  });

  it('should render account suspended notice on ACCOUNT_SUSPENDED error', () => {
    const error = new ApiError({
      status: 403,
      code: ApiErrorCode.AccountSuspended,
      message: 'Account has been suspended',
      requestUrl: '/api/v1/auth/login',
    });
    authServiceSpy.login.mockReturnValue(throwError(() => error));

    component.loginForm.setValue({
      email: 'suspended@ecobin.org',
      password: 'password123',
    });

    component.submitLogin();
    fixture.detectChanges();

    expect(component.isSuspended()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    const notice = el.querySelector('app-notice');
    expect(notice).toBeTruthy();
    expect(notice?.textContent).toContain('Account suspended');
  });

  it('should map VALIDATION_ERROR details to field errors', () => {
    const error = new ApiError({
      status: 400,
      code: ApiErrorCode.ValidationError,
      message: 'Validation failed',
      details: {
        email: 'Email domain is not authorized',
        password: 'Password must not be empty',
      },
      requestUrl: '/api/v1/auth/login',
    });
    authServiceSpy.login.mockReturnValue(throwError(() => error));

    component.loginForm.setValue({
      email: 'unauthorized@gmail.com',
      password: 'password123',
    });

    component.submitLogin();
    fixture.detectChanges();

    expect(component.emailServerError()).toBe('Email domain is not authorized');
    expect(component.passwordServerError()).toBe('Password must not be empty');
    expect(component.loginForm.controls.email.invalid).toBe(true);
  });

  it('should render "Administrators only" notice on AuthError NOT_ADMIN', () => {
    const error = new AuthError('NOT_ADMIN', 'Access denied: Only system administrators can access this portal');
    authServiceSpy.login.mockReturnValue(throwError(() => error));

    component.loginForm.setValue({
      email: 'collector@ecobin.org',
      password: 'password123',
    });

    component.submitLogin();
    fixture.detectChanges();

    expect(component.isNotAdmin()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    const notice = el.querySelector('app-notice');
    expect(notice).toBeTruthy();
    expect(notice?.textContent).toContain('Administrators only');
  });

  it('should track loading state during in-flight login request', () => {
    const subject = new Subject<LoginResponse>();
    authServiceSpy.login.mockReturnValue(subject.asObservable());

    component.loginForm.setValue({
      email: 'admin@ecobin.org',
      password: 'password123',
    });

    expect(component.isLoading()).toBe(false);
    component.submitLogin();
    expect(component.isLoading()).toBe(true);

    subject.next(mockAdminResponse);
    subject.complete();
    expect(component.isLoading()).toBe(false);
  });

  it('should conditionally render prototype hint based on environment.useMockBackend', () => {
    const el = fixture.nativeElement as HTMLElement;
    const hint = el.querySelector('.mock-backend-card, .prototype-hint');

    if (environment.useMockBackend) {
      expect(hint).toBeTruthy();
      expect(hint?.textContent).toContain('Mock backend');
      expect(hint?.textContent).toContain('wrongpass');
    } else {
      expect(hint).toBeNull();
    }
  });

  it('should toggle password visibility and update aria-pressed', () => {
    expect(component.showPassword()).toBe(false);

    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);

    fixture.detectChanges();
    const toggleBtn = fixture.nativeElement.querySelector('.input-icon-trailing-btn');
    if (toggleBtn) {
      expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');
    }

    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(false);
  });

  it('should detect caps lock and show warning hint', () => {
    expect(component.capsLockActive()).toBe(false);

    // Event with CapsLock active
    const eventOn = {
      getModifierState: (key: string) => key === 'CapsLock',
    } as unknown as KeyboardEvent;
    component.checkCapsLock(eventOn);
    expect(component.capsLockActive()).toBe(true);

    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const warning = el.querySelector('.caps-lock-hint');
    expect(warning).toBeTruthy();
    expect(warning?.textContent).toContain('Caps Lock is on');

    // Event with CapsLock inactive
    const eventOff = {
      getModifierState: () => false,
    } as unknown as KeyboardEvent;
    component.checkCapsLock(eventOff);
    expect(component.capsLockActive()).toBe(false);
  });

  it('should fill mock credentials when fill button is clicked', () => {
    if (!environment.useMockBackend) {
      return;
    }

    component.fillMockCredentials();
    expect(component.loginForm.value).toEqual({
      email: 'admin@ecobin.eg',
      password: 'password123',
    });
    expect(component.loginForm.valid).toBe(true);
  });

  it('should open and handle "Forgot password?" modal workflow', () => {
    expect(component.isForgotPasswordOpen()).toBe(false);

    component.openForgotPassword();
    expect(component.isForgotPasswordOpen()).toBe(true);
    expect(component.forgotSubmitted()).toBe(false);

    // Invalid submission
    component.submitForgotPassword();
    expect(authServiceSpy.forgotPassword).not.toHaveBeenCalled();

    // Valid submission
    component.forgotForm.setValue({ email: 'admin@ecobin.org' });
    component.submitForgotPassword();

    expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith({ email: 'admin@ecobin.org' });
    expect(component.forgotSubmitted()).toBe(true);

    component.closeForgotPassword();
    expect(component.isForgotPasswordOpen()).toBe(false);
  });
});
