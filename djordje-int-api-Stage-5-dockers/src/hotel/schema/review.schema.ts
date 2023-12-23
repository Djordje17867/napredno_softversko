import { Schema, Document } from 'mongoose';

export const ReviewSchema = new Schema({
  hotelId: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    min: 1,
    max: 5,
  },
});

export type Review = {
  hotelId: string;
  description: string;
  value: number;
};

ReviewSchema.index({ value: 1 });

export type ReviewDocument = Review & Document;
