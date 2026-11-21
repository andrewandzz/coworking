import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings/bookings.controller.js';
import { BookingsService } from './bookings/bookings.service.js';
import { BookingEntity, DeskEntity } from './bookings/entities.js';
import { databaseOptions } from './database.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: databaseOptions }),
    TypeOrmModule.forFeature([DeskEntity, BookingEntity]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class AppModule {}
