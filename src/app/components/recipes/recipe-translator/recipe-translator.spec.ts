import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { RecipeTranslator } from './recipe-translator';

describe('RecipeTranslator', () => {
  let component: RecipeTranslator;
  let fixture: ComponentFixture<RecipeTranslator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeTranslator],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeTranslator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
