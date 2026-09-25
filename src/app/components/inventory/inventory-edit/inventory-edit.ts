import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, switchMap, catchError, of, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { InventoryService } from '../../../services/inventory-service';
import { InventoryEditFormData } from '../../../models/inventory.models';
import { INVENTORY_CATEGORIES, STORAGE_LOCATIONS, INVENTORY_UNITS, INVENTORY_VALIDATION_RULES, getTodayDateString } from '../../../constants/inventory.constants';

@Component({
  selector: 'app-inventory-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inventory-edit.html',
  styleUrls: ['./inventory-edit.css']
})
export class InventoryEdit implements OnInit, OnDestroy {

  inventoryInput: InventoryEditFormData = {
    ingredientName: '',
    quantity: 0.01,
    unit: '',
    category: '',
    purchaseDate: '',
    expirationDate: '',
    location: '',
    cost: 0.01
  };

  originalItemName: string | null = null;
  currentInventoryId: string | null = null;
  isLoading = true; // For initial data loading
  isSaving = false; // For submission loading state
  errorMessage: string | null = null;
  successMessage: string | null = null;
  submitted = false; // Controls validation message visibility

  // Expose constants to template
  readonly categories = [...INVENTORY_CATEGORIES];
  readonly locations = [...STORAGE_LOCATIONS];
  readonly units = [...INVENTORY_UNITS];
  readonly validationRules = INVENTORY_VALIDATION_RULES;
  readonly todayDateString = getTodayDateString();

  private routeSubscription: Subscription | undefined;

  // Inject services
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.pipe(
      tap(params => {
        this.currentInventoryId = params.get('inventoryId');
        this.isLoading = true;
        this.errorMessage = null;
        this.successMessage = null;
      }),
      switchMap(() => {
        if (!this.currentInventoryId) {
          this.errorMessage = "Inventory ID not found in URL.";
          this.isLoading = false;
          return of(null); // Stop if no ID
        }
        // Fetch the item data
        return this.inventoryService.getInventoryItemById(this.currentInventoryId).pipe(
          catchError((err: HttpErrorResponse) => {
            console.error('Error fetching inventory item for edit:', err);
            this.errorMessage = `Failed to load item: ${err.status === 404 ? 'Item not found.' : (err.error?.error || err.message)}`;
            this.isLoading = false;
            return of(null); // Return null on error
          })
        );
      })
    ).subscribe(item => {
      this.isLoading = false; // Stop loading
      if (item) {
        this.originalItemName = item.ingredientName;
        // Populate the form model
        this.inventoryInput = {
          inventoryId: item.inventoryId, // Keep ID for context if needed
          ingredientName: item.ingredientName,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          location: item.location,
          purchaseDate: this.formatDateForInput(item.purchaseDate),
          expirationDate: this.formatDateForInput(item.expirationDate),
          cost: item.cost,
          status: item.status // Keep status for potential display, though not edited here
        };
      } else if (!this.errorMessage) {
        // Handle case where service returns null without specific error
        this.errorMessage = 'Item data could not be loaded.';
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe(); // Clean up subscription
  }

  // Helper to format date string or Date object to 'yyyy-MM-dd'
  private formatDateForInput(date: string | Date | undefined): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      // Adjust for potential timezone issues if needed, depending on how dates are stored/retrieved
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error("Error formatting date:", date, e);
      return ''; // Return empty string if date is invalid
    }
  }


  // Custom validation: Ensure expiration date is after purchase date
  isExpirationDateValid(form: NgForm): boolean {
    const purchaseDateControl = form.controls['purchaseDate'];
    const expirationDateControl = form.controls['expirationDate'];

    if (!purchaseDateControl?.value || !expirationDateControl?.value) {
      return true; // Let 'required' handle empty dates
    }
    // Compare dates directly as strings 'YYYY-MM-DD' works correctly.
    // Must be strictly after, matching the backend validation.
    return expirationDateControl.value > purchaseDateControl.value;
  }

  onSubmit(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (form.invalid || !this.isExpirationDateValid(form)) {
      if (!this.isExpirationDateValid(form)) {
        form.controls['expirationDate']?.setErrors({ ...form.controls['expirationDate']?.errors, 'invalidDateOrder': true });
        this.errorMessage = "Expiration date must be after the purchase date.";
      } else {
        this.errorMessage = "Please correct the errors highlighted in the form.";
      }
      Object.keys(form.controls).forEach(key => form.controls[key].markAsTouched());
      return; // Stop if invalid
    }

    if (!this.currentInventoryId) {
      this.errorMessage = "Cannot update: Inventory ID is missing.";
      return;
    }

    this.isSaving = true; // Set saving state

    // Prepare payload, excluding non-editable fields
    const payload: Partial<InventoryEditFormData> = { ...this.inventoryInput };
    delete payload.inventoryId;
    delete payload.userId;
    delete payload.status;

    this.inventoryService.updateInventoryItem(this.currentInventoryId, payload).subscribe({
      next: (updatedItem) => {
        this.isSaving = false;
        this.successMessage = `Item "${updatedItem.ingredientName}" updated successfully!`;
        this.originalItemName = updatedItem.ingredientName; // Update display name
        this.submitted = false; // Reset submitted flag to hide validation errors
        setTimeout(() => {
          if (this.currentInventoryId) {
            // Navigate back to the view page of the updated item
            this.router.navigate(['/inventory/view', this.currentInventoryId]);
          } else {
            this.router.navigate(['/inventory']); // Fallback
          }
        }, 1500);
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        console.error('Error updating inventory item:', err);
        this.errorMessage = err.error?.error || err.error?.details?.join(', ') || 'Failed to update item. Please try again.';
      }
    });
  }

}