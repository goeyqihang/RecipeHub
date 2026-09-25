import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { InventoryView } from './inventory-view';

describe('InventoryView', () => {
  let component: InventoryView;
  let fixture: ComponentFixture<InventoryView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryView],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
