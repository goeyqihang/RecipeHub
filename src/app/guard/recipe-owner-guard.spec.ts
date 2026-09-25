import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { recipeOwnerGuard } from './recipe-owner-guard';
import { AuthService } from '../services/auth-service';

describe('recipeOwnerGuard', () => {
  let httpMock: HttpTestingController;

  const editRoute = { paramMap: convertToParamMap({ recipeId: 'R-00001' }) } as ActivatedRouteSnapshot;

  const runGuard = () => TestBed.runInInjectionContext(
    () => recipeOwnerGuard(editRoute, {} as RouterStateSnapshot)
  ) as Observable<boolean | UrlTree>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);

    // Log in as chef U-00001
    TestBed.inject(AuthService).login({ email: 'chef@example.com', password: 'Passw0rd!' }).subscribe();
    httpMock.expectOne('/api/login').flush({
      token: 'test-token',
      user: { _id: '1', userId: 'U-00001', fullname: 'Test Chef', email: 'chef@example.com', role: 'chef' }
    });
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('lets the author edit their recipe', async () => {
    const result = firstValueFrom(runGuard());
    httpMock.expectOne('/api/recipes/view/R-00001').flush({ recipeId: 'R-00001', userId: 'U-00001' });

    expect(await result).toBeTrue();
  });

  it("sends other chefs to the access-denied page", async () => {
    const result = firstValueFrom(runGuard());
    httpMock.expectOne('/api/recipes/view/R-00001').flush({ recipeId: 'R-00001', userId: 'U-00002' });

    expect(TestBed.inject(Router).serializeUrl(await result as UrlTree)).toBe('/access-denied');
  });
});
