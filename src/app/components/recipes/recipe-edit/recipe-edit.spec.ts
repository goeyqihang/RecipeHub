import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { RecipeEdit } from './recipe-edit';

describe('RecipeEdit', () => {
  let component: RecipeEdit;
  let fixture: ComponentFixture<RecipeEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeEdit],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
