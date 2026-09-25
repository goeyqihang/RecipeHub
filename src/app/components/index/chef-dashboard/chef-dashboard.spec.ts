import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ChefDashboard } from './chef-dashboard';

describe('ChefDashboard', () => {
  let component: ChefDashboard;
  let fixture: ComponentFixture<ChefDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChefDashboard],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChefDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
