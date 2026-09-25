import { Component } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { DashboardService, DashboardData } from '../../../services/dashboard-service';
import { AuthService } from '../../../services/auth-service';
import { Observable } from 'rxjs';
import { LoginUser } from '../../../models/auth.models';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css'
})
export class ManagerDashboard {
  dashboardData$: Observable<DashboardData>;
  currentUser$: Observable<LoginUser | null>;

  constructor(private dashboardService: DashboardService, private authService: AuthService) {
    this.dashboardData$ = this.dashboardService.getDashboardData();
    this.currentUser$ = this.authService.currentUser$;
  }
}