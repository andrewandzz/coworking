import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CoworkingBrand } from '../../../shared/ui/coworking-brand/coworking-brand';
import { ManagerAuth } from '../manager-auth';

@Component({
  selector: 'app-manager-layout',
  imports: [CoworkingBrand, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './manager-layout.html',
  styleUrl: './manager-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerLayout {
  private readonly auth = inject(ManagerAuth);
  private readonly router = inject(Router);

  protected readonly signingOut = signal(false);
  protected readonly signOutError = signal('');

  protected async signOut(): Promise<void> {
    if (this.signingOut()) return;

    this.signingOut.set(true);
    this.signOutError.set('');
    try {
      await this.auth.signOut();
      await this.router.navigate(['/manager', 'login'], { replaceUrl: true });
    } catch {
      this.signOutError.set('Не вдалося завершити сесію. Спробуйте ще раз.');
    } finally {
      this.signingOut.set(false);
    }
  }
}
