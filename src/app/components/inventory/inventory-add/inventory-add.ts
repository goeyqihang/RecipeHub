import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InventoryService } from '../../../services/inventory-service';
import { InventoryCreateForm } from '../../../models/inventory.models';

import { AuthService } from '../../../services/auth-service';
import { INVENTORY_CATEGORIES, STORAGE_LOCATIONS, INVENTORY_UNITS, INVENTORY_VALIDATION_RULES, getTodayDateString } from '../../../constants/inventory.constants';
import { take } from 'rxjs';

@Component({
  selector: 'app-inventory-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inventory-add.html',
  styleUrls: ['./inventory-add.css']
})
export class InventoryAdd implements OnInit {
  inventoryInput: InventoryCreateForm = {
    ingredientName: '',
    quantity: 1,
    unit: '',
    category: '',
    purchaseDate: getTodayDateString(),
    expirationDate: '',
    location: '',
    cost: 0.01
  };

  // Default state for resetting the form
  defaultFormValues: InventoryCreateForm = { ...this.inventoryInput };

  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  submitted = false; // To control when validation messages appear

  // Expose constants to the template
  readonly categories = [...INVENTORY_CATEGORIES];
  readonly locations = [...STORAGE_LOCATIONS];
  readonly units = [...INVENTORY_UNITS];
  readonly validationRules = INVENTORY_VALIDATION_RULES;
  readonly todayDateString = getTodayDateString(); // Today's date for max attribute on purchase date

  private inventoryService = inject(InventoryService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // For displaying the user who added the item
  currentUserFullname: string | null = null;
  currentUserId: string | null = null;

  ngOnInit(): void {
    // Get current user info
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentUserFullname = user.fullname;
        this.currentUserId = user.userId;
      }
    });
  }

  // Custom validation: Ensure expiration date is after purchase date
  isExpirationDateValid(form: NgForm): boolean {
    const purchaseDateControl = form.controls['purchaseDate'];
    const expirationDateControl = form.controls['expirationDate'];

    if (!purchaseDateControl || !expirationDateControl || !purchaseDateControl.value || !expirationDateControl.value) {
      return true;
    }

    const purchaseDate = new Date(purchaseDateControl.value);
    const expirationDate = new Date(expirationDateControl.value);

    // Set time to 0 to compare dates only
    purchaseDate.setHours(0, 0, 0, 0);
    expirationDate.setHours(0, 0, 0, 0);

    return expirationDate > purchaseDate;
  }


  onSubmit(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top to show messages

    // Check built-in Angular validation and custom date validation
    if (form.invalid || !this.isExpirationDateValid(form)) {
      // Manually set error for custom date validation if it fails
      if (!this.isExpirationDateValid(form)) {
        form.controls['expirationDate']?.setErrors({ ...form.controls['expirationDate']?.errors, 'invalidDateOrder': true });
        this.errorMessage = "Expiration date must be after the purchase date.";
      } else {
        this.errorMessage = "Please correct the errors highlighted in the form.";
      }
      // Ensure all controls are marked as touched to display errors
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      return; // Stop submission if invalid
    }

    this.isLoading = true;
    const payload: InventoryCreateForm = { ...this.inventoryInput };

    this.inventoryService.addInventoryItem(payload).subscribe({
      next: (savedItem) => {
        this.isLoading = false;
        this.successMessage = `Item "${savedItem.ingredientName}" added successfully!`;
        form.resetForm(this.defaultFormValues); // Reset form to initial state
        this.submitted = false; // Reset submitted flag
        setTimeout(() => this.router.navigate(['/inventory']), 1500);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error adding inventory item:', err);
        // Extract backend error message if available
        this.errorMessage = err.error?.error || err.error?.details?.join(', ') || 'Failed to add item. Please try again.';
      }
    });
  }
}