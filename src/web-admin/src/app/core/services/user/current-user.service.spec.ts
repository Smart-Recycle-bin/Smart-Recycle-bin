import { TestBed } from '@angular/core/testing';
import { CurrentUserService } from './current-user.service';

describe('CurrentUserService', () => {
  let service: CurrentUserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CurrentUserService],
    });
    service = TestBed.inject(CurrentUserService);
  });

  it('should provide a placeholder current user', () => {
    expect(service.user()).toBeTruthy();
    expect(service.user().role).toBe('SYS_ADMIN');
  });

  it('should update user via setUser', () => {
    service.setUser({
      id: 'ADM-002',
      name: 'Operator Two',
      email: 'op2@ecobin.local',
      role: 'ADMIN',
    });
    expect(service.user().name).toBe('Operator Two');
  });
});
