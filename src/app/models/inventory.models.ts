/**
 * Represents the full InventoryItem object received from the backend.
 * Matches the structure defined in backend/models/inventoryItem.js
 */
export interface InventoryItem {
  _id: string;
  inventoryId: string;
  userId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  category: string;
  purchaseDate: Date | string;
  expirationDate: Date | string;
  location: string;
  cost: number;
  status: string;
  consumedDate?: Date | string;
  createdDate: Date | string;
}

/**
 * Represents the data structure needed for the Add Inventory Item form.
 * Fields match the required inputs for creating a new item.
 */
export interface InventoryCreateForm {
  ingredientName: string;
  quantity: number;
  unit: string;
  category: string;
  purchaseDate: string;
  expirationDate: string;
  location: string;
  cost: number;
}

/**
 * Represents the data structure for the Edit Inventory Item form.
 * Extends the create form, as most fields are the same.
 * Optionally includes inventoryId for identification during updates.
 * Includes fields that might be displayed but not directly editable in the main edit form (like userId, status).
 */
export interface InventoryEditFormData extends InventoryCreateForm {
  inventoryId?: string;
  userId?: string;
  status?: string;
}

export interface InventoryStats {
  totalValue: number;
  totalItems: number;
  expiringSoonCount: number;
  lowStockCount: number;
}

export interface InventoryListData {
  inventoryItems: InventoryItem[];
  stats: InventoryStats;
}

export interface InventoryFilters {
  category?: string;
  location?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  expiringWithinDays?: number;
}