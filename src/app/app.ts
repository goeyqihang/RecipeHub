import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthService } from './services/auth-service';
import { Header } from './components/layout/header/header';
import { Footer } from './components/layout/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, AsyncPipe, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  isLoggedIn$: Observable<boolean>;

  constructor(private authService: AuthService) {
    this.isLoggedIn$ = this.authService.isLoggedIn$;
  }
}