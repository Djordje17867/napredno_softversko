import { Schema, Document } from 'mongoose';

export const FileSchema = new Schema(
  {
    serviceId: String,
    type: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export type File = {
  serviceId: string;
  name: string;
  key: string;
  type: string;
};

export type FileDocument = File & Document;
