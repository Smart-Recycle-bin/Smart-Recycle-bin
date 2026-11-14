import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CurrentUserService } from './current-user.service';
import { AuthService } from '../auth/auth.service';
import { TokenStorageService } from '../auth/token-storage.service';

describe('CurrentUserService', () => {
  let service: CurrentUserService;

  beforeEach(() => {
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
  });

  it('should provide fallback user when no session is present', () => {
    expect(service.user()).toBeTruthy();
    expect(service.user().role).toBe('SYS_ADMIN');
    expect(service.user().name).toBe('Laila Hamdy');
  });

  it('should update user via setUser override', () => {
    service.setUser({
      id: 'ADM-002',
      name: 'Amr Shawky',
      email: 'amr.shawky@ecobin.eg',
      role: 'SYS_ADMIN',
    });
    expect(service.user().name).toBe('Amr Shawky');
    expect(service.user().id).toBe('ADM-002');
  });
});
