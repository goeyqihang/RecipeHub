import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { RecipeAdd } from './recipe-add';

describe('RecipeAdd', () => {
  let component: RecipeAdd;
  let fixture: ComponentFixture<RecipeAdd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeAdd],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeAdd);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
