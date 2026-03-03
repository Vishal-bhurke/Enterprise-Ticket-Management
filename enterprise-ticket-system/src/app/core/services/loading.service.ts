import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _count = signal(0);
  private readonly _message = signal('Please wait...');

  readonly isLoading = computed(() => this._count() > 0);
  readonly message = this._message.asReadonly();

  show(message = 'Please wait...'): void {
    this._message.set(message);
    this._count.update(c => c + 1);
  }

  hide(): void {
    // Math.max prevents counter going negative if hide() is called without show()
    this._count.update(c => Math.max(0, c - 1));
  }
}
