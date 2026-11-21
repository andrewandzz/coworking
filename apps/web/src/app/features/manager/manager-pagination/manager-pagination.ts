import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

@Component({
  selector: 'app-manager-pagination',
  imports: [LucideChevronLeft, LucideChevronRight],
  templateUrl: './manager-pagination.html',
  styleUrl: './manager-pagination.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerPagination {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChanged = output<number>();

  protected readonly pageCount = computed(() => Math.ceil(this.total() / this.pageSize()));
  protected readonly first = computed(() => (this.page() - 1) * this.pageSize() + 1);
  protected readonly last = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
  protected readonly pages = computed(() => {
    const count = Math.min(5, this.pageCount());
    const first = Math.max(1, Math.min(this.page() - Math.floor(count / 2), this.pageCount() - count + 1));
    return Array.from({ length: count }, (_, index) => first + index);
  });
}
