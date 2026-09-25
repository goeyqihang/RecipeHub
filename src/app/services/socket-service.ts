import { Injectable, OnDestroy, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, filter } from 'rxjs';
import { AuthService } from './auth-service';

// How long to wait for the server to generate the audio
const SPEECH_TIMEOUT_MS = 30000;

type SpeechReply = { audioUrl: string } | { error: string };

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private authService = inject(AuthService);
  private socket: Socket | null = null;

  constructor() {
    // Drop the connection on logout; the next request reconnects with the new user's token
    this.authService.isLoggedIn$.pipe(filter(isLoggedIn => !isLoggedIn)).subscribe(() => this.disconnect());
  }

  ngOnDestroy() {
    this.disconnect();
  }

  /**
   * Asks the server to read a recipe's instructions aloud.
   * Emits the URL of the generated MP3, or errors with a message to show the user.
   */
  requestSpeech(recipeId: string): Observable<string> {
    return new Observable<string>(subscriber => {
      const socket = this.getSocket();

      // The server rejected the handshake, e.g. because the login token has expired
      const onConnectError = () => subscriber.error(new Error('Could not connect to the audio service. Please log in again.'));
      socket.once('connect_error', onConnectError);

      socket.timeout(SPEECH_TIMEOUT_MS).emit('recipe:text-to-speech', { recipeId }, (err: Error | null, reply: SpeechReply) => {
        if (err) {
          subscriber.error(new Error('The audio service did not respond. Please try again.'));
        } else if ('error' in reply) {
          subscriber.error(new Error(reply.error));
        } else {
          subscriber.next(reply.audioUrl);
          subscriber.complete();
        }
      });

      return () => socket.off('connect_error', onConnectError);
    });
  }

  // Connects on first use, authenticating with the current login token
  private getSocket(): Socket {
    if (!this.socket) {
      this.socket = io({
        auth: (callback) => callback({ token: this.authService.getToken() })
      });
    } else if (!this.socket.active) {
      // A rejected handshake is not retried automatically
      this.socket.connect();
    }
    return this.socket;
  }

  private disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
