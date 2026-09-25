import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { InventoryList } from './inventory-list';

describe('InventoryList', () => {
  let component: InventoryList;
  let fixture: ComponentFixture<InventoryList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
