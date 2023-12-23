import { Schema, Document } from 'mongoose';
import { Booking } from 'src/booking/schema/bookings.schema';

export const HotelSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  numOfGuests: {
    type: Number,
    required: true,
  },
  availableDays: [
    {
      type: String,
    },
  ],
  numOfStars: {
    type: Number,
    min: 1,
    max: 5,
  },
  autoAccept: {
    type: Boolean,
  },
  skiCenterId: {
    type: String,
    required: true,
  },
});

HotelSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'hotelId',
});

HotelSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'serviceId',
});

HotelSchema.set('toObject', { virtuals: true });
HotelSchema.set('toJSON', { virtuals: true });

HotelSchema.index({ price: 1, numOfStars: 1 });
HotelSchema.index({ numOfStars: 1 });
HotelSchema.index({ name: 1 });

export type Hotel = {
  _id?: string;
  name: string;
  address: string;
  price: number;
  numOfGuests: number;
  numOfStars: number;
  availableDays: string[];
  bookings?: [Booking];
  autoAccept: boolean;
  skiCenterId: string;
};

export type HotelDocument = Hotel & Document;
