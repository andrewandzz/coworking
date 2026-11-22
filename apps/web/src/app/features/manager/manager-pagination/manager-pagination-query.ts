import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { Params } from '@angular/router';

interface PageNavigation {
  queryParams?: Params;
  replaceUrl?: boolean;
}

@Injectable()
export class ManagerPaginationQuery {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly page = computed(() => {
    const value = this.params().get('page');
    if (!value || !/^[1-9]\d*$/.test(value)) return 1;

    const page = Number(value);
    return Number.isSafeInteger(page) ? page : 1;
  });

  setPage(page: number, { queryParams, replaceUrl }: PageNavigation = {}): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...queryParams, page: page === 1 ? null : page },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  syncPage(page: number): void {
    const values = this.params().getAll('page');
    const matches = page === 1 ? values.length === 0 : values.length === 1 && values[0] === String(page);
    if (!matches && !this.router.currentNavigation()) this.setPage(page, { replaceUrl: true });
  }
}
