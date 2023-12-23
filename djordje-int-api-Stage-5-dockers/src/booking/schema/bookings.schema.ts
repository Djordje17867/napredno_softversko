import { Schema, Document } from 'mongoose';
import { Service } from '../../track/schema/service.enum';

export const BookingSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    serviceId: {
      type: String,
      required: true,
    },
    skiCenterId: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    numOfGuests: {
      type: Number,
      min: 1,
    },
    dateFrom: {
      type: Date,
      required: true,
    },
    dateTo: {
      type: Date,
      required: true,
    },
    serviceType: {
      type: String,
      enum: Service,
    },
    isApproved: {
      type: Boolean,
      required: true,
    },
    isCancelled: {
      type: Boolean,
    },
    cancelledBy: {
      type: String,
      validate: {
        validator: function (value: string) {
          return !this.isCancelled || !!value;
        },
        message: 'cancelledBy is required when isCancelled is true',
      },
    },
  },
  {
    timestamps: true,
  },
);

BookingSchema.index({ serviceId: 1, createdAt: 1 });

BookingSchema.index({ createdAt: 1 });

export type Booking = {
  _id?: string;
  userId: string;
  serviceId: string;
  skiCenterId: string;
  value: number;
  numOfGuests: number;
  dateFrom: Date;
  dateTo: Date;
  serviceType: Service;
  isApproved: boolean;
  isCancelled?: boolean;
  cancelledBy?: string;
};

export type BookingDocument = Booking & Document;
