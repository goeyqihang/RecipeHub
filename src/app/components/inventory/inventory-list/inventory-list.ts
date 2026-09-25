import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, BehaviorSubject, switchMap, catchError, of, tap, distinctUntilChanged } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { InventoryService } from '../../../services/inventory-service';
import { InventoryItem, InventoryFilters, InventoryListData } from '../../../models/inventory.models';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { INVENTORY_CATEGORIES, STORAGE_LOCATIONS } from '../../../constants/inventory.constants';

const DEFAULT_FILTERS: InventoryFilters = { category: 'all', location: 'all', status: 'In Stock', sortBy: '', sortDir: 'asc' };

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AsyncPipe, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './inventory-list.html',
  styleUrls: ['./inventory-list.css']
})
export class InventoryList {

  // Observable for the entire data structure including items and stats
  inventoryListData$: Observable<InventoryListData>;
  isLoading = true;
  error: string | null = null;

  // --- Filter State Management ---
  // BehaviorSubject holds the current filters and triggers re-fetch on change
  private filterSubject = new BehaviorSubject<InventoryFilters>({ status: 'In Stock' });

  // Filter model bound to the template's form elements using [(ngModel)].
  // Starts with every dropdown on a real option; 'all' and '' mean "no filter" and aren't sent to the API.
  currentFilters: InventoryFilters = { ...DEFAULT_FILTERS };

  // Expose constants to the template for filter dropdowns
  readonly categories = ['all', ...INVENTORY_CATEGORIES];
  readonly locations = ['all', ...STORAGE_LOCATIONS];
  readonly statuses = ['In Stock', 'Consumed', 'Wasted'];

  // --- Deletion Modal State ---
  itemToDelete: InventoryItem | null = null;
  deletionReason: 'Consumed' | 'Wasted' | 'PermanentDelete' = 'Consumed';

  private inventoryService = inject(InventoryService);
  private modalService = inject(NgbModal);

  constructor() {
    // The main data stream reacts to changes from the filterSubject
    this.inventoryListData$ = this.filterSubject.pipe(
      // Only emit when the filter value has actually changed
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      // Show loading indicator when a new filter is applied
      tap(() => {
        this.isLoading = true;
        this.error = null;
      }),
      // Cancel previous HTTP request and switch to a new one with the latest filters
      switchMap(filters => this.inventoryService.getInventoryItems(filters).pipe(
        catchError(err => {
          console.error('Error loading filtered inventory:', err);
          this.error = 'Failed to load inventory items. Please try again later.';
          // Return a safe, empty structure on error to prevent the stream from breaking
          return of({ inventoryItems: [], stats: { totalValue: 0, totalItems: 0, expiringSoonCount: 0, lowStockCount: 0 } });
        })
      )),
      // Hide loading indicator after data has been fetched
      tap(() => this.isLoading = false)
    );
  }

  // --- Filter Methods ---
  applyFilters(): void {
    const activeFilters: InventoryFilters = {};

    (Object.keys(this.currentFilters) as Array<keyof InventoryFilters>).forEach(key => {
      const value = this.currentFilters[key]; // value can be string | number | 'asc' | 'desc' | undefined

      // Check if the value is valid and not 'all'
      if (value !== null && value !== undefined && value !== '' && value !== 'all') {
        // Safely assign based on the key's expected type
        if (key === 'expiringWithinDays') {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            activeFilters[key] = numValue; // Assign as number
          }
        } else if (key === 'sortDir') {
          // Specifically handle sortDir: only assign if it's 'asc' or 'desc'
          if (value === 'asc' || value === 'desc') {
            activeFilters[key] = value; // Assign the specific literal type
          }
          // If value is not 'asc' or 'desc', simply ignore it (it remains undefined in activeFilters)
        } else {
          // Assume other keys expect a string type
          activeFilters[key] = String(value); // Assign as string
        }
      }
    });

    // Ensure 'In Stock' is the default status if none is selected
    if (!activeFilters.status) {
      activeFilters.status = 'In Stock';
    }

    this.filterSubject.next(activeFilters); // Push the new filters
  }

  clearFilters(): void {
    this.currentFilters = { ...DEFAULT_FILTERS }; // Reset the form model to default
    this.applyFilters(); // Apply the reset filters
  }

  // --- Helper functions for template ---
  isExpired(expirationDate: Date | string | undefined): boolean {
    if (!expirationDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(expirationDate) < today;
  }

  daysUntilExpiration(expirationDate: Date | string | undefined): number | null {
    if (!expirationDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expirationDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getExpirationBadgeClass(expirationDate: Date | string | undefined): string {
    const daysLeft = this.daysUntilExpiration(expirationDate);
    if (daysLeft === null) return 'bg-secondary';
    if (daysLeft <= 0) return 'bg-danger';
    if (daysLeft <= 7) return 'bg-warning text-dark';
    return 'bg-success';
  }

  // --- Delete Modal Logic ---
  openDeleteConfirmation(content: any, item: InventoryItem): void {
    this.itemToDelete = item;
    this.deletionReason = 'Consumed';
    this.modalService.open(content, { ariaLabelledBy: 'modal-confirm-delete-inventory' }).result.then(
      (result) => {
        if (result === 'delete' && this.itemToDelete) {
          this.performDelete(this.itemToDelete.inventoryId, this.deletionReason);
        }
        this.itemToDelete = null;
      },
      () => {
        // Modal dismissed (canceled or closed)
        this.itemToDelete = null;
      }
    );
  }

  private performDelete(inventoryId: string, reason: 'Consumed' | 'Wasted' | 'PermanentDelete'): void {
    this.error = null;
    this.inventoryService.deleteInventoryItem(inventoryId, reason).subscribe({
      next: (response) => {
        alert(response.message || 'Item removed successfully!');
        // Trigger a refresh by pushing the current filters again
        this.filterSubject.next(this.filterSubject.value);
      },
      error: (err) => {
        console.error('Error removing inventory item:', err);
        this.error = `Failed to remove item: ${err.error?.error || 'Unknown error'}`;
        alert(this.error);
      }
    });
  }
}