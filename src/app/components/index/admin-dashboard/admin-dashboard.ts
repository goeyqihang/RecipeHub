import { Component } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { DashboardService, DashboardData } from '../../../services/dashboard-service';
import { AuthService } from '../../../services/auth-service';
import { Observable } from 'rxjs';
import { LoginUser } from '../../../models/auth.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, DatePipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  dashboardData$: Observable<DashboardData>;
  currentUser$: Observable<LoginUser | null>;

  constructor(private dashboardService: DashboardService, private authService: AuthService) {
    this.dashboardData$ = this.dashboardService.getDashboardData();
    this.currentUser$ = this.authService.currentUser$;
  }
}