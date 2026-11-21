import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { App } from './app/app';

bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    provideRouter([
      {
        path: '',
        pathMatch: 'full',
        title: 'Coworking · Бронювання просторів',
        loadComponent: () => import('./app/features/spaces/coworking-page/coworking-page')
          .then(({ CoworkingPage }) => CoworkingPage),
      },
      {
        path: 'manager',
        loadChildren: () => import('./app/features/manager/manager.routes').then(({ managerRoutes }) => managerRoutes),
      },
      {
        path: '',
        loadComponent: () => import('./app/booking-layout').then(({ BookingLayout }) => BookingLayout),
        children: [
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
        ],
      },
      { path: '**', redirectTo: '' },
    ], withHashLocation()),
  ],
}).catch((error: unknown) => console.error(error));
