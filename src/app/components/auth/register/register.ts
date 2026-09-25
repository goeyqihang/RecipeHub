import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../../services/auth-service';
import { RegisterUser } from '../../../models/auth.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {

  registerUser: RegisterUser = {
    fullname: '',
    email: '',
    password: '',
    phone: '',
    role: ''
  };
  errorMessage: string | null = null;
  submitted = false; // Used to control when validation messages are displayed

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  /**
   * When submitting the form, receive the NgForm instance from the template.
   * @param form - The NgForm instance passed from the template (#registerForm)
   */
  onSubmit(form: NgForm): void {
    this.submitted = true; // Mark the form as having been attempted to submit
    this.errorMessage = null;

    // Check if the form is valid before submitting
    if (form.invalid) {
      return;
    }

    // Pass the model data to the registration service
    this.authService.register(this.registerUser).subscribe({
      next: () => {
        alert('Registration successful! Please log in.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        // Get the specific error message from the backend response
        this.errorMessage = err.error?.error || 'An unexpected error occurred during registration.';
        console.error(err);
      }
    });
  }
}

