import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagerAuthModule } from '../manager-auth/manager-auth.module.js';
import { ManagerBookingsController } from '../manager-bookings/manager-bookings.controller.js';
import { ManagerBookingsService } from '../manager-bookings/manager-bookings.service.js';
import { ManagerReportsController } from '../manager-bookings/manager-reports.controller.js';
import { BookingPassEntity } from './booking-pass.entity.js';
import { BookingPassesController, BookingReservationsController, ManagerCheckInsController } from './booking-passes.controller.js';
import { BookingPassesService } from './booking-passes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([BookingPassEntity]), ManagerAuthModule],
  controllers: [
    BookingReservationsController, BookingPassesController,
    ManagerBookingsController, ManagerReportsController, ManagerCheckInsController,
  ],
  providers: [BookingPassesService, ManagerBookingsService],
})
export class BookingPassesModule {}
