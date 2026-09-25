import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ManagerDashboard } from './manager-dashboard';

describe('ManagerDashboard', () => {
  let component: ManagerDashboard;
  let fixture: ComponentFixture<ManagerDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerDashboard],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
