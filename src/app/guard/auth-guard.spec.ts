import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { authGuard } from './auth-guard';
import { AuthService } from '../services/auth-service';

describe('authGuard', () => {
  let router: Router;

  const runGuard = () => TestBed.runInInjectionContext(
    () => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
  ) as Observable<boolean>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => localStorage.clear());

  it('sends logged-out users to the login page', async () => {
    expect(await firstValueFrom(runGuard())).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('lets logged-in users through', async () => {
    TestBed.inject(AuthService).login({ email: 'chef@example.com', password: 'Passw0rd!' }).subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/login').flush({
      token: 'test-token',
      user: { _id: '1', userId: 'U-00001', fullname: 'Test Chef', email: 'chef@example.com', role: 'chef' }
    });

    expect(await firstValueFrom(runGuard())).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
