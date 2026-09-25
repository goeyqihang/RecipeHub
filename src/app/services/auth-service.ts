import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';
import { LoginCredentials, LoginResponse, LoginUser, RegisterUser } from '../models/auth.models';
import { API_BASE_URL } from '../constants/api.constants';

// localStorage key for the login token, so the user stays logged in across page reloads
const TOKEN_KEY = 'recipehub.token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = API_BASE_URL;

  private _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this._isLoggedIn$.asObservable();

  private _currentUser$ = new BehaviorSubject<LoginUser | null>(null);
  currentUser$ = this._currentUser$.asObservable();

  constructor(private http: HttpClient) { }

  /** The current user's login token (JWT), or null when logged out. */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Sends a registration request to the backend API.
   * @param userData - An object containing user registration details (fullname, email, etc.).
   * @returns An Observable that emits a success message or an error.
   */
  register(userData: RegisterUser): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/register`, userData);
  }

  /**
   * Restores the logged-in user when the application starts, if a stored token is still valid.
   * @returns An Observable that resolves to true if the user is logged in, otherwise false.
   */
  checkSession(): Observable<boolean> {
    if (!this.getToken()) {
      return of(false);
    }

    return this.http.get<{ user: LoginUser }>(`${this.baseUrl}/session`).pipe(
      tap(response => this.setUser(response.user)),
      map(() => true),
      catchError(() => {
        // The token has expired or is no longer valid
        this.clearSession();
        return of(false);
      })
    );
  }

  /**
   * Sends login credentials to the backend.
   * On success, stores the token and updates the authentication state.
   * @param credentials - An object containing the user's email and password.
   * @returns An Observable that emits the User object on successful login.
   */
  login(credentials: LoginCredentials): Observable<LoginUser> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap(({ token, user }) => {
        localStorage.setItem(TOKEN_KEY, token);
        this.setUser(user);
      }),
      map(({ user }) => user)
    );
  }

  /** Logs out. The server keeps no session, so forgetting the token is all that's needed. */
  logout(): void {
    this.clearSession();
  }

  /** Forgets the token and the logged-in user, e.g. on logout or when the token has expired. */
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._isLoggedIn$.next(false);
    this._currentUser$.next(null);
  }

  private setUser(user: LoginUser): void {
    this._currentUser$.next(user);
    this._isLoggedIn$.next(true);
  }
}
