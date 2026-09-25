import { Component } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthService } from '../../../services/auth-service';
import { LoginUser } from '../../../models/auth.models';
import { ChefDashboard } from '../chef-dashboard/chef-dashboard';
import { ManagerDashboard } from '../manager-dashboard/manager-dashboard';
import { AdminDashboard } from '../admin-dashboard/admin-dashboard';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    ChefDashboard,
    ManagerDashboard,
    AdminDashboard
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  currentUser$: Observable<LoginUser | null>;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }
}