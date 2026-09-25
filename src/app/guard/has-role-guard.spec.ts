import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { hasRoleGuard } from './has-role-guard';
import { AuthService } from '../services/auth-service';

describe('hasRoleGuard', () => {
  // A route that only chefs may open, like /recipes
  const chefOnlyRoute = { data: { roles: ['chef'] } } as unknown as ActivatedRouteSnapshot;

  const runGuard = () => TestBed.runInInjectionContext(
    () => hasRoleGuard(chefOnlyRoute, {} as RouterStateSnapshot)
  ) as Observable<boolean | UrlTree>;

  const logInAs = (role: string) => {
    TestBed.inject(AuthService).login({ email: `${role}@example.com`, password: 'Passw0rd!' }).subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/login').flush({
      token: 'test-token',
      user: { _id: '1', userId: 'U-00001', fullname: `Test ${role}`, email: `${role}@example.com`, role }
    });
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
  });

  afterEach(() => localStorage.clear());

  it('lets users with an allowed role through', async () => {
    logInAs('chef');
    expect(await firstValueFrom(runGuard())).toBeTrue();
  });

  it('sends other roles to the access-denied page', async () => {
    logInAs('manager');
    const result = await firstValueFrom(runGuard());
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/access-denied');
  });
});
