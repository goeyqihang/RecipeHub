import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { InventoryEdit } from './inventory-edit';

describe('InventoryEdit', () => {
  let component: InventoryEdit;
  let fixture: ComponentFixture<InventoryEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryEdit],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
