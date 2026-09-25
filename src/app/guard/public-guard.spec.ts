import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { publicGuard } from './public-guard';
import { AuthService } from '../services/auth-service';

describe('publicGuard', () => {
  let router: Router;

  const runGuard = () => TestBed.runInInjectionContext(
    () => publicGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
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

  it('shows the login and registration pages to logged-out users', async () => {
    expect(await firstValueFrom(runGuard())).toBeTrue();
  });

  it('sends logged-in users to their dashboard', async () => {
    TestBed.inject(AuthService).login({ email: 'chef@example.com', password: 'Passw0rd!' }).subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/login').flush({
      token: 'test-token',
      user: { _id: '1', userId: 'U-00001', fullname: 'Test Chef', email: 'chef@example.com', role: 'chef' }
    });

    expect(await firstValueFrom(runGuard())).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
