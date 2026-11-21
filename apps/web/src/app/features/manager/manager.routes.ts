import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn, Routes } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ManagerAuth } from './manager-auth';

const requireManager: CanActivateFn = () => {
  const router = inject(Router);
  const signIn = router.createUrlTree(['/manager', 'login']);
  return inject(ManagerAuth).getSession().pipe(
    map(({ manager }) => manager ? true : signIn),
    catchError(() => of(signIn)),
  );
};

const redirectSignedInManager: CanActivateFn = () => {
  const router = inject(Router);
  return inject(ManagerAuth).getSession().pipe(
    map(({ manager }) => manager ? router.createUrlTree(['/manager', 'bookings']) : true),
    catchError(() => of(true)),
  );
};

export const managerRoutes: Routes = [
  {
    path: 'login',
    title: 'Вхід менеджера · Coworking',
    canActivate: [redirectSignedInManager],
    loadComponent: () => import('./manager-login-page/manager-login-page').then(({ ManagerLoginPage }) => ManagerLoginPage),
  },
  {
    path: '',
    canActivateChild: [requireManager],
    loadComponent: () => import('./manager-layout/manager-layout').then(({ ManagerLayout }) => ManagerLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'bookings' },
      {
        path: 'bookings',
        title: 'Бронювання · Coworking',
        loadComponent: () => import('./manager-bookings-page/manager-bookings-page')
          .then(({ ManagerBookingsPage }) => ManagerBookingsPage),
      },
      {
        path: 'reports',
        title: 'Звітність · Coworking',
        loadComponent: () => import('./manager-reports-page/manager-reports-page')
          .then(({ ManagerReportsPage }) => ManagerReportsPage),
      },
      {
        path: 'check-in',
        title: 'Перевірка перепустки · Coworking',
        loadComponent: () => import('./manager-check-in-page/manager-check-in-page')
          .then(({ ManagerCheckInPage }) => ManagerCheckInPage),
      },
    ],
  },
];
