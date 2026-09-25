import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RecipeForm } from './recipe-form';
import { RecipeCreateForm } from '../../../models/recipe.model';

describe('RecipeForm', () => {
  let component: RecipeForm;
  let fixture: ComponentFixture<RecipeForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeForm],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeForm);
    component = fixture.componentInstance;
    component.chefName = 'Test Chef';
    fixture.detectChanges();
  });

  const fillValidRecipe = () => {
    component.form.patchValue({ title: 'Tomato Soup', mealType: 'Lunch', cuisineType: 'Italian', prepTime: 30, difficulty: 'Easy', servings: 2 });
    component.ingredients.at(0).setValue('Salt, to taste');
    component.addIngredient();
    component.ingredients.at(1).setValue('  4 ripe tomatoes  ');
    component.instructions.at(0).setValue('Simmer everything for 20 minutes.');
  };

  it('starts with one ingredient row and one step row', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('[formArrayName="ingredients"] input').length).toBe(1);
    expect(element.querySelectorAll('[formArrayName="instructions"] textarea').length).toBe(1);
  });

  it('adds and removes rows within the allowed range', () => {
    component.removeIngredient(0);
    expect(component.ingredients.length).toBe(1); // At least one row stays

    for (let i = 0; i < 25; i++) {
      component.addIngredient();
    }
    expect(component.ingredients.length).toBe(20); // Maximum number of ingredients

    component.removeIngredient(5);
    expect(component.ingredients.length).toBe(19);
  });

  it('highlights errors instead of emitting an invalid recipe', () => {
    const save = spyOn(component.save, 'emit');

    component.onSubmit();
    fixture.detectChanges();

    expect(save).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.is-invalid').length).toBeGreaterThan(0);
  });

  it('checks entry length after trimming spaces', () => {
    fillValidRecipe();
    component.ingredients.at(0).setValue('   ab   ');
    expect(component.ingredients.at(0).hasError('minlength')).toBeTrue();
  });

  it('emits trimmed lists, keeping commas inside an entry', () => {
    const save = spyOn(component.save, 'emit');

    fillValidRecipe();
    component.onSubmit();

    expect(save).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'Tomato Soup',
      chef: 'Test Chef',
      ingredients: ['Salt, to taste', '4 ripe tomatoes'],
      instructions: ['Simmer everything for 20 minutes.'],
    }));
  });

  it('loads an existing recipe for editing', () => {
    const recipe: RecipeCreateForm = {
      title: 'Pancakes', chef: 'Test Chef', ingredients: ['2 eggs', '1 cup milk', '1 cup flour'],
      instructions: ['Whisk everything together.', 'Fry in a hot pan until golden.'],
      mealType: 'Breakfast', cuisineType: 'American', prepTime: 20, difficulty: 'Easy', servings: 4,
    };

    fixture.componentRef.setInput('recipe', recipe);
    fixture.detectChanges();

    expect(component.form.controls.title.value).toBe('Pancakes');
    expect(component.ingredients.getRawValue()).toEqual(recipe.ingredients);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[formArrayName="instructions"] textarea').length).toBe(2);
  });
});
