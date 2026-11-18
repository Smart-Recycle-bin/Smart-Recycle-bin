import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';
import { StoredSession } from '@models/auth/auth.dto';
import { UserRole } from '@models/user/user-role.enum';
import { environment } from '@env/environment';

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  const mockSession: StoredSession = {
    accessToken: 'test_access_token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    refreshToken: 'test_refresh_token',
    user: {
      userId: 'ADM-001',
      displayName: 'Laila Hamdy',
      role: UserRole.Admin,
    },
  };

  beforeEach(() => {
    localStorage.removeItem(environment.sessionStorageKey);
    TestBed.configureTestingModule({
      providers: [TokenStorageService],
    });
    service = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    localStorage.removeItem(environment.sessionStorageKey);
  });

  it('should return null when no session is stored', () => {
    expect(service.getSession()).toBeNull();
  });

  it('should save and retrieve session from localStorage', () => {
    service.saveSession(mockSession);
    const retrieved = service.getSession();
    expect(retrieved).toEqual(mockSession);
  });

  it('should clear stored session', () => {
    service.saveSession(mockSession);
    expect(service.getSession()).toBeTruthy();

    service.clearSession();
    expect(service.getSession()).toBeNull();
  });

  it('should emit session changes across subscribers', () => {
    let emitted: StoredSession | null = null;
    service.storageChanges$.subscribe((s) => {
      emitted = s;
    });

    service.saveSession(mockSession);
    expect(emitted).toEqual(mockSession);

    service.clearSession();
    expect(emitted).toBeNull();
  });
});
