import { Component } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { DashboardService, DashboardData } from '../../../services/dashboard-service';
import { AuthService } from '../../../services/auth-service';
import { Observable } from 'rxjs';
import { LoginUser } from '../../../models/auth.models';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-chef-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, DatePipe, RouterLink],
  templateUrl: './chef-dashboard.html',
  styleUrl: './chef-dashboard.css'
})
export class ChefDashboard {
  dashboardData$: Observable<DashboardData>;
  currentUser$: Observable<LoginUser | null>;

  constructor(private dashboardService: DashboardService, private authService: AuthService) {
    this.dashboardData$ = this.dashboardService.getDashboardData();
    this.currentUser$ = this.authService.currentUser$;
  }
}