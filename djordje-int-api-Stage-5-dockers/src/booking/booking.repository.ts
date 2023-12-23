import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { Booking, BookingDocument } from './schema/bookings.schema';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class BookingRepository {
  constructor(
    @InjectModel('Booking')
    private readonly bookingModel: mongoose.Model<Booking>,
  ) {}

  async find(
    userId: string,
    options: { limit: number; skip: number },
    dateSort: 1 | -1,
  ): Promise<BookingDocument[]> {
    return this.bookingModel.find({ userId: userId }, null, options).sort({
      createdAt: dateSort,
    });
  }

  async findAllBookings(
    query,
    options: { limit: number; skip: number },
    dateSort: 1 | -1,
  ): Promise<BookingDocument[]> {
    return this.bookingModel.find(query, null, options).sort({
      createdAt: dateSort,
    });
  }

  async countDocuments(options) {
    return this.bookingModel.countDocuments(options);
  }

  async findOneAndUpdate(
    query: {
      _id: string;
      userId?: string;
      skiCenterId?: string;
    },
    update: {
      isCancelled?: boolean;
      cancelledBy?: string;
      isApproved?: boolean;
    },
    options: {
      new: boolean;
    },
  ): Promise<Booking> {
    return await this.bookingModel.findOneAndUpdate(query, update, options);
  }

  async findQuery(query): Promise<BookingDocument[]> {
    return this.bookingModel.find(query);
  }

  async findOne(query: {
    _id: string;
    userId: string;
  }): Promise<BookingDocument> {
    return this.bookingModel.findOne(query);
  }

  async create(booking: Booking): Promise<BookingDocument> {
    return await this.bookingModel.create(booking);
  }
}
