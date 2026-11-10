import { Injectable, signal } from '@angular/core';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CurrentUserService {
  private readonly _user = signal<CurrentUser>({
    id: 'ADM-001',
    name: 'Admin User',
    email: 'admin@ecobin.local',
    role: 'SYS_ADMIN',
  });

  readonly user = this._user.asReadonly();

  setUser(user: CurrentUser): void {
    this._user.set(user);
  }
}
