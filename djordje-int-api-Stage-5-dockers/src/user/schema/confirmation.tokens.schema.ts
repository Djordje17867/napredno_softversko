import { Schema, Document } from 'mongoose';

export const confirmationTokenSchema = new Schema(
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

confirmationTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1200 });

export type confirmationToken = {
  userId: string;
  value: string;
};

export type confirmationTokenDocument = confirmationToken & Document;
