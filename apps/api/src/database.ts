import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BookingPassEntity } from './booking-passes/booking-pass.entity.js';
import { BookingEntity, DeskEntity } from './bookings/entities.js';
import { parsePort, requiredEnv } from './config.js';
import { CreateBookings1763668800000 } from './migrations/1763668800000-create-bookings.js';
import { CreateBookingPasses1795305600000 } from './migrations/1795305600000-create-booking-passes.js';
import { AddBookingPassPhone1795478400000 } from './migrations/1795478400000-add-booking-pass-phone.js';
import { AddSpaceReservations1795564800000 } from './migrations/1795564800000-add-space-reservations.js';

export function databaseOptions(): TypeOrmModuleOptions {
  const options = {
    entities: [DeskEntity, BookingEntity, BookingPassEntity],
    migrations: [
      CreateBookings1763668800000, CreateBookingPasses1795305600000,
      AddBookingPassPhone1795478400000, AddSpaceReservations1795564800000,
    ],
    migrationsRun: true,
    synchronize: false,
    retryAttempts: 1,
  };

  switch (process.env.DB_TYPE ?? 'sqlite') {
    case 'mssql':
      return {
        ...options,
        type: 'mssql',
        host: process.env.DB_HOST ?? '127.0.0.1',
        port: parsePort('DB_PORT', 1433),
        database: process.env.DB_NAME ?? 'coworking',
        username: requiredEnv('DB_USER'),
        password: requiredEnv('DB_PASSWORD'),
        options: {
          encrypt: true,
          trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true',
        },
      };
    case 'sqlite': {
      const defaultFile = fileURLToPath(new URL('../data/coworking.sqlite', import.meta.url));
      const location = resolve(process.env.DB_FILE ?? defaultFile);
      mkdirSync(dirname(location), { recursive: true });
      return { ...options, type: 'sqljs', location, autoSave: true };
    }
    default:
      throw new Error('DB_TYPE must be sqlite or mssql.');
  }
}
