import { Schema, Document } from 'mongoose';
import { Hotel } from 'src/hotel/schema/hotel.schema';
import { Track } from 'src/track/schema/track.schema';

export const skiCenterSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  location: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
});

skiCenterSchema.virtual('hotels', {
  ref: 'Hotel',
  localField: '_id',
  foreignField: 'skiCenterId',
});

skiCenterSchema.virtual('tracks', {
  ref: 'Hotel',
  localField: '_id',
  foreignField: 'skiCenterId',
});

skiCenterSchema.set('toObject', { virtuals: true });
skiCenterSchema.set('toJSON', { virtuals: true });

skiCenterSchema.index({ name: 1, createdAt: -1 });

export type SkiCenter = {
  _id?: string;
  name: string;
  location: string;
  description: string;
  hotels?: Hotel[];
  tracks?: Track[];
};

export type SkiCenterDocument = SkiCenter & Document;
