import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { authInterceptor } from './auth-interceptor';
import { AuthService } from '../services/auth-service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('adds the token to API requests only', () => {
    localStorage.setItem('recipehub.token', 'abc');

    http.get('/api/recipes').subscribe();
    http.get('/audio/recipe.mp3').subscribe();

    expect(httpMock.expectOne('/api/recipes').request.headers.get('Authorization')).toBe('Bearer abc');
    expect(httpMock.expectOne('/audio/recipe.mp3').request.headers.has('Authorization')).toBeFalse();
  });

  it('sends no Authorization header while logged out', () => {
    http.get('/api/recipes').subscribe();
    expect(httpMock.expectOne('/api/recipes').request.headers.has('Authorization')).toBeFalse();
  });

  it('logs the user out when the API rejects the token', () => {
    localStorage.setItem('recipehub.token', 'expired');

    http.get('/api/recipes').subscribe({ error: () => { } });
    httpMock.expectOne('/api/recipes').flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.getToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('leaves a failed login to the login page', () => {
    localStorage.setItem('recipehub.token', 'abc');

    http.post('/api/login', {}).subscribe({ error: () => { } });
    httpMock.expectOne('/api/login').flush({ error: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.getToken()).toBe('abc');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
