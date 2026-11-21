import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings/bookings.controller.js';
import { BookingsService } from './bookings/bookings.service.js';
import { BookingEntity, DeskEntity } from './bookings/entities.js';
import { databaseOptions } from './database.js';
import { ManagerAuthModule } from './manager-auth/manager-auth.module.js';
import { ManagerBookingsController } from './manager-bookings/manager-bookings.controller.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: databaseOptions }),
    TypeOrmModule.forFeature([DeskEntity, BookingEntity]),
    ManagerAuthModule,
  ],
  controllers: [BookingsController, ManagerBookingsController],
  providers: [BookingsService],
})
export class AppModule {}
