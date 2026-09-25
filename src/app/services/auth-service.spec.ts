import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth-service';
import { LoginUser } from '../models/auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const user: LoginUser = { _id: '1', userId: 'U-00001', fullname: 'Test Chef', email: 'chef@example.com', role: 'chef' };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('stores the token and the user after logging in', async () => {
    let loggedInUser: LoginUser | undefined;
    service.login({ email: user.email, password: 'Passw0rd!' }).subscribe(result => loggedInUser = result);

    const req = httpMock.expectOne('/api/login');
    expect(req.request.method).toBe('POST');
    req.flush({ token: 'test-token', user });

    expect(loggedInUser).toEqual(user);
    expect(service.getToken()).toBe('test-token');
    expect(await firstValueFrom(service.isLoggedIn$)).toBeTrue();
    expect(await firstValueFrom(service.currentUser$)).toEqual(user);
  });

  it('skips the session check when there is no stored token', async () => {
    expect(await firstValueFrom(service.checkSession())).toBeFalse();
    httpMock.expectNone('/api/session');
  });

  it('restores the user from a stored token', async () => {
    localStorage.setItem('recipehub.token', 'stored-token');

    const result = firstValueFrom(service.checkSession());
    httpMock.expectOne('/api/session').flush({ user });

    expect(await result).toBeTrue();
    expect(await firstValueFrom(service.currentUser$)).toEqual(user);
  });

  it('forgets a token that the server rejects', async () => {
    localStorage.setItem('recipehub.token', 'expired-token');

    const result = firstValueFrom(service.checkSession());
    httpMock.expectOne('/api/session').flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(await result).toBeFalse();
    expect(service.getToken()).toBeNull();
  });

  it('clears the token and the user on logout', async () => {
    service.login({ email: user.email, password: 'Passw0rd!' }).subscribe();
    httpMock.expectOne('/api/login').flush({ token: 'test-token', user });

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(await firstValueFrom(service.isLoggedIn$)).toBeFalse();
    expect(await firstValueFrom(service.currentUser$)).toBeNull();
  });
});
