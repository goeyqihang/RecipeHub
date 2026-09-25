import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InventoryItem, InventoryCreateForm, InventoryEditFormData, InventoryListData, InventoryFilters } from '../models/inventory.models';
import { API_BASE_URL } from '../constants/api.constants';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private baseUrl = `${API_BASE_URL}/inventory`;

  constructor(private http: HttpClient) { }

  /**
   * @desc    Fetches inventory items, optionally filtered, and key stats.
   * @route   GET /api/inventory
   * @param   filters Optional object containing filter criteria.
   */
  getInventoryItems(filters?: InventoryFilters): Observable<InventoryListData> {
    let params = new HttpParams();

    // Append filters to query parameters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    // Make the GET request with the constructed parameters
    return this.http.get<InventoryListData>(this.baseUrl, { params });
  }

  /**
   * @desc    Fetches a single inventory item by its ID.
   * @route   GET /api/inventory/view/:inventoryId
   */
  getInventoryItemById(inventoryId: string): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(`${this.baseUrl}/view/${inventoryId}`);
  }

  /**
   * @desc    Creates a new inventory item.
   * @route   POST /api/inventory/add
   */
  addInventoryItem(itemData: InventoryCreateForm): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(`${this.baseUrl}/add`, itemData);
  }

  /**
   * @desc    Updates an existing inventory item.
   * @route   PUT /api/inventory/update/:inventoryId
   * @param   inventoryId The ID of the item to update.
   * @param   itemData    The updated data for the item.
   */
  updateInventoryItem(inventoryId: string, itemData: Partial<InventoryEditFormData>): Observable<InventoryItem> {
    return this.http.put<InventoryItem>(`${this.baseUrl}/update/${inventoryId}`, itemData);
  }

  /**
   * @desc    Removes an inventory item (soft or hard delete).
   * @route   DELETE /api/inventory/delete/:inventoryId
   * @param   deletionReason Sent as request body for DELETE
   */
  deleteInventoryItem(inventoryId: string, deletionReason: 'Consumed' | 'Wasted' | 'PermanentDelete'): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/delete/${inventoryId}`, {
      body: { deletionReason }
    });
  }
}