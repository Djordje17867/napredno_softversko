import { Schema, Document } from 'mongoose';

export const refreshTokenSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

refreshTokenSchema.index({ createdAt: 1 }, { expires: '7d' });

export type refreshToken = {
  userId: string;
  value: string;
};

export type refreshTokenDocument = refreshToken & Document;
