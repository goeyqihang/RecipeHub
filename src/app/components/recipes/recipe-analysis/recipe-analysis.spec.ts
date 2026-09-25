import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { RecipeAnalysis } from './recipe-analysis';

describe('RecipeAnalysis', () => {
  let component: RecipeAnalysis;
  let fixture: ComponentFixture<RecipeAnalysis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeAnalysis],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeAnalysis);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
