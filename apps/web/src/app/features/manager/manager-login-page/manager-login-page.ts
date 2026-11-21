import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CoworkingBrand } from '../../../shared/ui/coworking-brand/coworking-brand';
import { ManagerAuth } from '../manager-auth';

@Component({
  selector: 'app-manager-login-page',
  imports: [CoworkingBrand],
  templateUrl: './manager-login-page.html',
  styleUrl: './manager-login-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerLoginPage {
  private readonly auth = inject(ManagerAuth);
  private readonly router = inject(Router);

  protected readonly pending = signal(false);
  protected readonly error = signal('');

  protected async signIn(event: SubmitEvent, form: HTMLFormElement): Promise<void> {
    event.preventDefault();
    if (this.pending()) return;

    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    this.pending.set(true);
    this.error.set('');

    try {
      await this.auth.signIn({ email, password });
      const enteredBookings = await this.router.navigate(['/manager', 'bookings'], { replaceUrl: true });
      if (!enteredBookings) this.error.set('Не вдалося відкрити бронювання. Спробуйте ще раз.');
    } catch (error) {
      this.error.set(this.loginError(error));
    } finally {
      this.pending.set(false);
    }
  }

  private loginError(error: unknown): string {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    switch (status) {
      case 400: return 'Перевірте email і пароль.';
      case 401: return 'Неправильний логін або пароль.';
      case 429: return 'Забагато спроб входу. Спробуйте за хвилину.';
      case 503: return 'Вхід менеджера ще не налаштовано.';
      default: return 'Не вдалося увійти. Спробуйте ще раз.';
    }
  }
}
