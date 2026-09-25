import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { RecipeAudioPlayer } from './recipe-audio-player';

describe('RecipeAudioPlayer', () => {
  let component: RecipeAudioPlayer;
  let fixture: ComponentFixture<RecipeAudioPlayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeAudioPlayer],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeAudioPlayer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
