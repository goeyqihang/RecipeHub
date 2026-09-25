import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AccessDenied } from './access-denied';

describe('AccessDenied', () => {
  let component: AccessDenied;
  let fixture: ComponentFixture<AccessDenied>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessDenied],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessDenied);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
