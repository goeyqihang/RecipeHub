import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subscription, switchMap, catchError, of, tap, BehaviorSubject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { InventoryService } from '../../../services/inventory-service';
import { InventoryItem } from '../../../models/inventory.models';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inventory-view',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink, DatePipe, CurrencyPipe, FormsModule],
  templateUrl: './inventory-view.html',
  styleUrls: ['./inventory-view.css']
})
export class InventoryView implements OnInit, OnDestroy {
  // Use a BehaviorSubject to hold the current item
  private itemSubject = new BehaviorSubject<InventoryItem | null>(null);
  item$: Observable<InventoryItem | null> = this.itemSubject.asObservable();

  isLoading = true;
  errorMessage: string | null = null;
  currentInventoryId: string | null = null; // Store the ID

  // For deletion modal
  itemToDelete: InventoryItem | null = null; // Store the full item for the modal context
  deletionReason: 'Consumed' | 'Wasted' | 'PermanentDelete' = 'Consumed';

  private routeSubscription: Subscription | undefined;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);
  private modalService = inject(NgbModal);

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.pipe(
      tap(params => {
        this.currentInventoryId = params.get('inventoryId'); // Get ID from route
        this.isLoading = true;
        this.errorMessage = null;
        this.itemSubject.next(null); // Clear previous item
      }),
      switchMap(() => {
        if (!this.currentInventoryId) {
          this.errorMessage = 'Inventory ID not found in URL.';
          this.isLoading = false;
          return of(null); // Return observable of null if ID is missing
        }
        // Fetch item data using the service
        return this.inventoryService.getInventoryItemById(this.currentInventoryId).pipe(
          catchError((err: HttpErrorResponse) => {
            console.error('Error fetching inventory item:', err);
            this.errorMessage = err.status === 404
              ? 'Inventory item not found.' // Specific message for 404
              : (err.error?.error || err.message || 'An unknown error occurred.');
            this.isLoading = false;
            return of(null); // Return observable of null on error
          })
        );
      }),
      tap(item => {
        this.itemSubject.next(item); // Update the BehaviorSubject
        this.isLoading = false; // Stop loading indicator
        if (!item && !this.errorMessage) {
          // Set default error if fetch returned null without specific error
          this.errorMessage = 'Item data could not be loaded or was not found.';
        }
      })
    ).subscribe(); // Value is handled in the tap operators
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  // --- Helper Functions ---
  isExpired(expirationDate: Date | string | undefined): boolean {
    if (!expirationDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(expirationDate) < today;
  }

  // --- Delete Modal Logic ---
  openDeleteConfirmation(content: any): void {
    const currentItem = this.itemSubject.getValue(); // Get the current item
    if (!currentItem) return;

    this.itemToDelete = currentItem; // Set the item for modal context
    this.deletionReason = 'Consumed'; // Reset reason
    this.modalService.open(content, { ariaLabelledBy: 'modal-confirm-delete-inventory-view' }).result.then(
      (result) => {
        if (result === 'delete' && this.itemToDelete) {
          // Use the stored item's ID and the selected deletionReason
          this.performDelete(this.itemToDelete.inventoryId, this.deletionReason);
        }
        this.itemToDelete = null; // Clear after modal close
      },
      () => {
        // Modal dismissed (canceled or closed)
        this.itemToDelete = null; // Clear after modal close
      }
    );
  }

  // --- Perform Deletion ---
  private performDelete(inventoryId: string, reason: 'Consumed' | 'Wasted' | 'PermanentDelete'): void {
    this.errorMessage = null; // Clear previous errors
    this.inventoryService.deleteInventoryItem(inventoryId, reason).subscribe({
      next: (response) => {
        alert(response.message || 'Item removed successfully!');
        // Navigate back to the inventory list upon successful deletion
        this.router.navigate(['/inventory']);
      },
      error: (err: HttpErrorResponse) => {
        // Display the error message on the details page
        this.errorMessage = `Failed to remove item: ${err.error?.error || err.message || 'Unknown error'}`;
        console.error('Error removing inventory item:', err);
      }
    });
  }
}