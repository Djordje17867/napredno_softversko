import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { User, UserDocument } from './schema/user.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel('User')
    private userModel: mongoose.Model<User>,
  ) {}

  async create(user: User): Promise<UserDocument> {
    return this.userModel.create(user);
  }

  async getUserByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    return user;
  }

  async findUserById(id: string): Promise<UserDocument> {
    return await this.userModel.findById(id);
  }

  async addProfilePicture(
    user: UserDocument,
    key: string,
  ): Promise<UserDocument> {
    return await this.userModel.findByIdAndUpdate(user.id, {
      profilePicture: key,
    });
  }

  async deleteProfilePicture(
    user: UserDocument,
    profilePicture: string,
  ): Promise<UserDocument> {
    return await this.userModel.findByIdAndUpdate(user.id, {
      profilePicture: profilePicture,
    });
  }

  async logoutAll(user: UserDocument): Promise<UserDocument> {
    return await this.userModel.findByIdAndUpdate(
      user.id,
      {
        $set: { refreshTokens: [] },
      },
      { new: true },
    );
  }

  async login(id: string, refreshToken: string): Promise<UserDocument> {
    return await this.userModel.findByIdAndUpdate(
      id,
      {
        $push: { refreshTokens: refreshToken },
      },
      { new: true },
    );
  }

  async findByRole(
    role: string,
    options: { limit: number; skip: number },
    nameSort: 1 | -1,
    dateSort: 1 | -1,
    skiCenterId: string,
  ): Promise<UserDocument[]> {
    const query: any = { role: role };
    if (skiCenterId) {
      query.skiCenterId = skiCenterId;
    }

    return this.userModel
      .find(query, null, options)
      .sort({ name: nameSort, createdAt: dateSort });
  }

  async countDocuments(options: { role?: string }): Promise<number> {
    return await this.userModel.countDocuments(options);
  }

  async findUserByCodeAndUpdate(
    code: string,
    newHashed: string,
  ): Promise<UserDocument> {
    return await this.userModel.findOneAndUpdate(
      { resetCode: code },
      { $unset: { resetCode: true }, $set: { password: newHashed } },
      { new: true },
    );
  }

  async delete(user: User): Promise<UserDocument> {
    return await this.userModel.findByIdAndDelete(user._id);
  }

  async saveUser(user: UserDocument): Promise<UserDocument> {
    return await user.save();
  }

  async findAll(
    options: { limit: number; skip: number },
    dateSort: 1 | -1,
    nameSort: 1 | -1,
  ): Promise<UserDocument[]> {
    return await this.userModel
      .find({}, null, options)
      .sort({ createdAt: dateSort, name: nameSort });
  }

  async returnWalletAmount(userId: string): Promise<number> {
    return (await this.userModel.findById(userId).select('wallet')).wallet;
  }
}
