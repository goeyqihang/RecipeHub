import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocketService } from '../../../services/socket-service';
import { Subscription } from 'rxjs';

type AudioStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';

@Component({
  selector: 'app-recipe-audio-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recipe-audio-player.html',
  styleUrls: ['./recipe-audio-player.css']
})
export class RecipeAudioPlayer implements OnChanges, OnDestroy {
  @Input({ required: true }) recipeId!: string;
  @Input({ required: true }) instructions!: string[];

  status: AudioStatus = 'idle';
  errorMessage: string | null = null;
  audioUrl: string | null = null;
  audioElement: HTMLAudioElement | null = null;
  currentVolume: number = 0.7;

  private socketService = inject(SocketService);
  private cdr = inject(ChangeDetectorRef);
  private speechSub: Subscription | undefined;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recipeId'] || changes['instructions']) {
      this.resetPlayer();
    }
  }

  ngOnDestroy(): void {
    this.speechSub?.unsubscribe();
    this.audioElement?.pause();
    this.audioElement = null;
  }

  requestSpeech(): void {
    if (this.status === 'loading' || !this.instructions || this.instructions.length === 0) {
      return;
    }

    this.resetPlayer(); // Reset state before making a new request
    this.status = 'loading';
    this.cdr.detectChanges(); // Update UI immediately

    // The server reads the recipe's stored instructions and replies with the MP3 URL
    this.speechSub = this.socketService.requestSpeech(this.recipeId).subscribe({
      next: (audioUrl) => {
        this.audioUrl = audioUrl;
        this.status = 'ready';
        this.initializeAudioElement();
        this.cdr.detectChanges();
      },
      error: (err: Error) => {
        this.errorMessage = err.message || 'An unknown error occurred during speech generation.';
        this.status = 'error';
        this.cdr.detectChanges();
      }
    });
  }

  playAudio(): void {
    if (this.audioElement && this.status !== 'playing') {
       this.audioElement.play().then(() => {
           this.status = 'playing';
           this.cdr.detectChanges();
       }).catch(error => {
           console.error("Error playing audio:", error);
           this.errorMessage = "Could not play audio.";
           this.status = 'error';
           this.cdr.detectChanges();
       });
    }
  }

  pauseAudio(): void {
    if (this.audioElement && this.status === 'playing') {
      this.audioElement.pause();
      this.status = 'paused';
      this.cdr.detectChanges();
    }
  }

  stopAudio(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0; // Reset time
      this.status = 'ready';
      this.cdr.detectChanges();
    }
  }

  setVolume(event: Event): void {
      const target = event.target as HTMLInputElement;
      if (target && this.audioElement) {
          this.currentVolume = parseFloat(target.value);
          this.audioElement.volume = this.currentVolume;
      }
  }


  private initializeAudioElement(): void {
      if (this.audioUrl) {
          this.audioElement = new Audio(this.audioUrl);
          this.audioElement.volume = this.currentVolume;
          // When audio finishes, reset status
          this.audioElement.onended = () => {
              this.status = 'ready';
              this.cdr.detectChanges(); // Update UI
          };
          this.audioElement.onerror = (e) => {
              console.error("Audio element error:", e);
              this.errorMessage = "Error loading or playing audio file.";
              this.status = 'error';
              this.audioUrl = null; // Clear URL on error
              this.cdr.detectChanges();
          }
      } else {
          this.audioElement = null;
      }
  }

  private resetPlayer(): void {
    this.speechSub?.unsubscribe();
    this.audioElement?.pause();
    this.audioElement = null;
    this.audioUrl = null;
    this.status = 'idle';
    this.errorMessage = null;
  }
}