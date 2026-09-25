import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, timer, switchMap, shareReplay, startWith, merge } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';

export interface DashboardData {
  stats: {
    users: number;
    recipes: number;
    inventory: number;
  };
  chefRecipes?: any[];
  expiringItems?: any[];
  recipeSuggestions?: any[];
  totalValue?: number;
  lowStockItems?: any[];
  userRoleDistribution?: any[];
  recentUsers?: any[];
  recentRecipes?: any[];
  recentInventory?: any[];
}


@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private baseUrl = `${API_BASE_URL}/dashboard`;

  private refresh$ = new Subject<void>();

  private dashboardData$: Observable<DashboardData>;

  constructor(private http: HttpClient) {
    const polling$ = timer(0, 30000); // Polls every 30 seconds, starts immediately

    this.dashboardData$ = merge(this.refresh$, polling$).pipe(
      startWith(0), // Immediately trigger the first fetch on subscription
      switchMap(() => this.http.get<DashboardData>(this.baseUrl)),
      shareReplay({ bufferSize: 1, refCount: true }) // Cache the last value and manage subscription lifecycle
    );
  }

  getDashboardData(): Observable<DashboardData> {
    return this.dashboardData$;
  }

  refreshDashboard(): void {
    this.refresh$.next();
  }
}