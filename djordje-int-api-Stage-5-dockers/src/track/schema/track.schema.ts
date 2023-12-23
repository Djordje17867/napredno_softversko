import { Schema, Document } from 'mongoose';
import { Rating } from './rating.enum';
import { Booking } from '../../booking/schema/bookings.schema';

export const TrackSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  length: {
    type: Number,
    required: true,
  },
  rating: {
    type: String,
    required: true,
    enum: Rating,
  },
  availableDays: [
    {
      type: String,
    },
  ],
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  numOfGuests: {
    type: Number,
    min: 0,
  },
  autoAccept: {
    type: Boolean,
  },
  skiCenterId: {
    type: String,
    required: true,
  },
});

TrackSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'serviceId',
});

TrackSchema.index({ length: 1, price: 1 });
TrackSchema.index({ price: 1 });

TrackSchema.set('toObject', { virtuals: true });
TrackSchema.set('toJSON', { virtuals: true });

TrackSchema.index({ name: 1, createdAt: -1 });

export type Track = {
  _id?: string;
  name: string;
  length: number;
  rating: Rating;
  price: number;
  numOfGuests: number;
  availableDays: string[];
  bookings?: [Booking];
  autoAccept: boolean;
  skiCenterId: string;
};

export type TrackDocument = Track & Document;
