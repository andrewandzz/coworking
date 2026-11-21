import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { App } from './app/app';

bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    provideRouter([
      { path: '', pathMatch: 'full', redirectTo: 'desks' },
      {
        path: 'desks',
        title: 'Робочі місця · Коворкінг',
        loadComponent: () => import('./app/desks/desks-page').then(({ DesksPage }) => DesksPage),
      },
      {
        path: 'bookings',
        title: 'Мої бронювання · Коворкінг',
        loadComponent: () => import('./app/bookings/bookings-page').then(({ BookingsPage }) => BookingsPage),
      },
      { path: '**', redirectTo: 'desks' },
    ], withHashLocation()),
  ],
}).catch((error: unknown) => console.error(error));
