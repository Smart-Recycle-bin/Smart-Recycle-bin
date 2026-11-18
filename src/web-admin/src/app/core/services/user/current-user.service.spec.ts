import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CurrentUserService } from './current-user.service';
import { AuthService } from '../auth/auth.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { UserRole } from '@models/user/user-role.enum';
import { environment } from '@env/environment';

describe('CurrentUserService', () => {
  let service: CurrentUserService;
  let authService: AuthService;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    localStorage.removeItem(environment.sessionStorageKey);

    TestBed.configureTestingModule({
      providers: [
        CurrentUserService,
        AuthService,
        TokenStorageService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CurrentUserService);
    authService = TestBed.inject(AuthService);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    localStorage.removeItem(environment.sessionStorageKey);
  });

  it('should return null when no session is present', () => {
    authService.clearSession();
    expect(service.user()).toBeNull();
  });

  it('should derive current user from active session with initials', () => {
    tokenStorage.saveSession({
      accessToken: 'valid_tok',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshToken: 'valid_ref',
      user: {
        userId: 'ADM-042',
        displayName: 'Tarek Zaki',
        role: UserRole.Admin,
      },
    });
    authService.restoreSession();

    const u = service.user();
    expect(u).not.toBeNull();
    expect(u?.id).toBe('ADM-042');
    expect(u?.name).toBe('Tarek Zaki');
    expect(u?.role).toBe(UserRole.Admin);
    expect(u?.initials).toBe('TZ');
    expect(u?.email).toBeUndefined();
  });

  it('should update user via setUser override', () => {
    service.setUser({
      id: 'ADM-002',
      name: 'Amr Shawky',
      email: 'amr.shawky@ecobin.eg',
      role: 'SYS_ADMIN',
    });
    expect(service.user()?.name).toBe('Amr Shawky');
    expect(service.user()?.id).toBe('ADM-002');
  });
});
