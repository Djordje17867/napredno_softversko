import { Schema, Document } from 'mongoose';
import { Role } from './role.enum';

export const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    date_of_birth: {
      type: Date,
      required: true,
    },
    resetCode: {
      type: String,
    },
    password: {
      type: String,
      minlength: 7,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    role: {
      required: true,
      type: String,
      enum: Role,
    },
    profilePicture: {
      type: String,
      required: false,
    },
    wallet: {
      type: Number,
      required: false,
      min: 0,
      selected: false,
    },
    isValidated: {
      type: Boolean,
      required: true,
    },
    skiCenterId: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

UserSchema.virtual('projects', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'userIds',
});

UserSchema.virtual('tokens', {
  ref: 'Tokens',
  localField: '_id',
  foreignField: 'userId',
});

UserSchema.index({ refreshTokens: 1 });

UserSchema.set('toObject', { virtuals: true });
UserSchema.set('toJSON', { virtuals: true });

export type User = {
  _id?: string;
  name: string;
  username: string;
  date_of_birth: Date;
  resetCode?: string;
  password: string;
  email: string;
  profilePicture?: string;
  role: Role;
  isValidated: boolean;
  wallet?: number;
  skiCenterId?: string;
};

export type UserDocument = User & Document;
