import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../../services/auth-service';
import { LoginCredentials } from '../../../models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  model: LoginCredentials = {
    email: '',
    password: ''
  };

  // Holds any error message returned from the backend API.
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  /**
   * Handles the form submission.
   * @param form - A reference to the NgForm, passed from the template.
   */
  onSubmit(form: NgForm): void {
    this.errorMessage = null;

    // Stop if the form is invalid
    if (form.invalid) {
      // Mark all fields as touched to display validation errors
      Object.keys(form.controls).forEach(field => {
        const control = form.control.get(field);
        control?.markAsTouched({ onlySelf: true });
      });
      return;
    }

    // Call the login method from AuthService
    this.authService.login(this.model).subscribe({
      next: () => {
        // On successful login, navigate to the dashboard
        this.router.navigate(['/dashboard']); // Navigate to a protected route
      },
      error: (err) => {
        // On failure, display the error message from the API
        this.errorMessage = err.error?.error || 'Login failed. Please check your credentials.';
      }
    });
  }
}
