import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { InventoryAdd } from './inventory-add';

describe('InventoryAdd', () => {
  let component: InventoryAdd;
  let fixture: ComponentFixture<InventoryAdd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryAdd],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryAdd);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
