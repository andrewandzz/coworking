import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagerAuthModule } from '../manager-auth/manager-auth.module.js';
import { BookingPassEntity } from './booking-pass.entity.js';
import { BookingPassesController, ManagerCheckInsController } from './booking-passes.controller.js';
import { BookingPassesService } from './booking-passes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([BookingPassEntity]), ManagerAuthModule],
  controllers: [BookingPassesController, ManagerCheckInsController],
  providers: [BookingPassesService],
})
export class BookingPassesModule {}
