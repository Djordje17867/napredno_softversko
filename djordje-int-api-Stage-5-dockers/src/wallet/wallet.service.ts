import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { User, UserDocument } from '../user/schema/user.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel('User')
    private readonly userModel: mongoose.Model<User>,
  ) { }

  async addCredits(id: string, amount: number): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      {
        $inc: { wallet: amount },
      },
      { new: true },
    );
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  async decreseCredits(
    user: UserDocument,
    amount: number,
  ): Promise<UserDocument> {
    return await this.userModel.findByIdAndUpdate(
      user.id,
      { $inc: { wallet: -amount } },
      { new: true },
    );
  }
}
