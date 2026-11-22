import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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
      try {
        await this.auth.signIn({ email, password });
      } catch (error) {
        this.error.set(this.loginError(error));
        return;
      }

      const session = await firstValueFrom(this.auth.getSession());
      if (!session.manager) {
        this.error.set('Пароль прийнято. Сесія відсутня. Перевірте налаштування cookie для цієї адреси.');
        return;
      }

      await this.router.navigate(['/manager', 'bookings'], { replaceUrl: true });
      if (!this.router.isActive('/manager/bookings', {
        paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored',
      })) {
        this.error.set('Сесію підтверджено. Не вдалося відкрити сторінку бронювань.');
      }
    } catch {
      this.error.set('Пароль прийнято. Не вдалося відкрити менеджерський розділ. Спробуйте ще раз.');
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
