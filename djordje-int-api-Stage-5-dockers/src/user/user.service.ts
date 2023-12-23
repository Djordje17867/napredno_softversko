import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import validator from 'validator';
import { UserRepository } from './user.repository';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { refreshTokenDocument } from './schema/refreshToken.schema';
import { Role } from './schema/role.enum';
import { Pagination } from 'src/interfaces/pagination.interface';
import { SendgridService } from '../emails/sendgrid.service';
import { AWSService } from '../aws/aws.service';
import {
  confirmationToken,
  confirmationTokenDocument,
} from './schema/confirmation.tokens.schema';
import { Booking } from 'src/booking/schema/bookings.schema';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel('Token')
    private tokenModel: mongoose.Model<refreshTokenDocument>,
    @InjectModel('ConfirmationToken')
    private confTokenModel: mongoose.Model<confirmationTokenDocument>,
    @InjectModel('Booking')
    private readonly BookingModel: mongoose.Model<Booking>,
    private userRepository: UserRepository,
    private configService: ConfigService,
    private sendgridService: SendgridService,
    private readonly awsService: AWSService,
    private readonly walletService: WalletService,
  ) {}

  async create(user: User): Promise<UserDocument> {
    if (user.role !== 'admin' && user.role !== 'user') {
      throw new BadRequestException('Role not supported');
    }
    if (!validator.isEmail(user.email)) {
      throw new BadRequestException(`${user.email} is not valid for an email!`);
    }
    const testUser = await this.userRepository.getUserByEmail(user.email);
    if (testUser) {
      throw new BadRequestException(`Email ${user.email} is already in use`);
    }

    user.profilePicture = this.configService.get<string>(
      'PLAIN_USER_PICTURE_KEY',
    );
    user.password = await this.validateAndHashPasswrod(user.password);

    const savedUser = await this.userRepository.create(user);
    const code = await this.hash(savedUser.id + '' + savedUser.email);
    const token: confirmationToken = {
      userId: savedUser.id,
      value: code,
    };
    await this.confTokenModel.create(token);
    // UNFINISHED - When i seed data i have to comment those lines, in order not to spam random people's mails
    // this.sendgridService.sendConfirmationEmail(
    //   savedUser.email,
    //   code,
    //   savedUser.id,
    // );
    return savedUser;
  }

  async findAll(
    perPage: number,
    page: number,
    dateSort: 1 | -1,
    nameSort: 1 | -1,
  ): Promise<Pagination<UserDocument>> {
    await this.validatePagination(perPage, page);
    const options = {
      limit: perPage,
      skip: perPage * (page - 1) || 0,
    };
    const [users, usernum] = await Promise.all([
      this.userRepository.findAll(options, nameSort, dateSort),
      this.userRepository.countDocuments({}),
    ]);
    const pagination: Pagination<UserDocument> = {
      items: users,
      totalItems: usernum,
    };
    return pagination;
  }

  async findByRole(
    role: Role,
    perPage: number,
    page: number,
    dateSort: 1 | -1,
    nameSort: 1 | -1,
    user: User,
  ): Promise<Pagination<UserDocument>> {
    await this.validatePagination(perPage, page);
    const options = {
      limit: perPage,
      skip: perPage * (page - 1) || 0,
    };
    const queryParam = role === Role.ADMIN ? user.skiCenterId : null;
    const [users, usersNum] = await Promise.all([
      this.userRepository.findByRole(
        role,
        options,
        nameSort,
        dateSort,
        queryParam,
      ),
      this.userRepository.countDocuments({ role }),
    ]);

    const pagination: Pagination<UserDocument> = {
      items: users,
      totalItems: usersNum,
    };
    return pagination;
  }

  async logoutAll(user: UserDocument): Promise<any> {
    return await this.tokenModel.deleteMany({ userId: user.id });
  }

  async addRefreshToken(
    user: UserDocument,
    refreshToken: string,
  ): Promise<refreshTokenDocument> {
    return await this.tokenModel.create({
      userId: user.id,
      value: refreshToken,
    });
  }

  async removeRefreshToken(
    user: UserDocument,
    refreshToken: string,
  ): Promise<UserDocument> {
    return await this.tokenModel.findOneAndDelete({
      userId: user.id,
      value: refreshToken,
    });
  }

  async findUserRefreshTokens(
    user: UserDocument,
  ): Promise<refreshTokenDocument[]> {
    return await this.tokenModel.find({ userId: user.id });
  }

  async login(id: string, refreshToken: string): Promise<UserDocument> {
    return this.userRepository.login(id, refreshToken);
  }

  async changePassword(
    user: UserDocument,
    oldPassword: string,
    newPassword: string,
  ): Promise<UserDocument> {
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const isMatch = await this.matchPassword(oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Passwords do not match');
    }
    const newHashed = await this.validateAndHashPasswrod(newPassword);
    user.password = newHashed;
    await this.userRepository.saveUser(user);
    return user;
  }

  async confirmEmail(code: string, id: string): Promise<string> {
    const user = await this.userRepository.findUserById(id);
    if (!user) throw new BadRequestException();
    const confToken = await this.confTokenModel.findOne({ userId: id });
    if (!confToken) throw new NotFoundException();

    const match = bcrypt.compare(code, confToken.value);
    if (!match) throw new BadRequestException();

    user.isValidated = true;
    user.wallet = 0;
    await user.save();
    return 'Email succesfully confirmed';
  }

  async resendConfEmail(user: UserDocument): Promise<string> {
    const code = await this.hash(user.id + '' + user.email);
    const token: confirmationToken = {
      userId: user.id,
      value: code,
    };
    await this.confTokenModel.create(token);
    this.sendgridService.sendConfirmationEmail(user.email, code, user.id);
    return 'Email was resent';
  }

  async confirmReset(code: string, newPassword: string): Promise<string> {
    const newHashed = await this.validateAndHashPasswrod(newPassword);
    await this.userRepository.findUserByCodeAndUpdate(code, newHashed);
    return 'Succesfully resseted the password';
  }

  async resetPassword(email: string): Promise<string> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const code = await this.hash(user.id + '' + user.email);
    user.resetCode = code;
    await user.save();
    this.sendgridService.sendResetEmail(user.email, code);
    return `Reset mail sent to an email ${user.email}`;
  }

  async hash(password: string): Promise<string> {
    const saltRounds = parseInt(this.configService.get('ROUNDS'));
    const hash = await bcrypt.hash(password, saltRounds);

    return hash;
  }

  async uploadAWS(
    user: UserDocument,
    file: Buffer,
    acl: string,
  ): Promise<string> {
    const fileName = `profilePictures/${user.id}`;
    const key = await this.awsService.uploadAWS(fileName, file, acl);
    await this.userRepository.addProfilePicture(user, key);
    return key;
  }

  async delete(user: User): Promise<UserDocument> {
    return this.userRepository.delete(user);
  }

  async deleteAWS(user: UserDocument): Promise<string> {
    const plainProfilePicture = this.configService.get<string>(
      'PLAIN_USER_PICTURE_KEY',
    );
    await this.userRepository.deleteProfilePicture(user, plainProfilePicture);
    return this.awsService.deleteFileAWS(user.profilePicture);
  }

  async getProfilePicture(id: string): Promise<string> {
    const user = await this.userRepository.findUserById(id);
    if (!user.profilePicture) {
      const profPicture = this.configService.get<string>(
        'PLAIN_USER_PICTURE_KEY',
      );
      return this.awsService.getFileByKeyAWS(profPicture);
    }
    return this.awsService.getFileByKeyAWS(user.profilePicture);
  }

  async validateAndHashPasswrod(password: string): Promise<string> {
    const isStrong = validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    });

    if (!isStrong) {
      throw new BadRequestException(
        'Weak password. Make sure it has atleast 8 characters, atleast one uppercase letter, number and special symbol',
      );
    }

    const saltRounds = parseInt(this.configService.get('ROUNDS'));
    const hash = await bcrypt.hash(password, saltRounds);

    return hash;
  }

  async findUserById(id: string): Promise<UserDocument> {
    const user = await this.userRepository.findUserById(id);
    if (!user) {
      throw new NotFoundException('No user found');
    } else {
      return user;
    }
  }

  async findUserByEmail(email: string): Promise<UserDocument> {
    return await this.userRepository.getUserByEmail(email);
  }

  async validatePagination(perPage: number, page: number) {
    if (perPage < 1 || page < 1) {
      throw new BadRequestException('Pagination not valid');
    }
  }

  async matchPassword(password: string, hashedPass: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, hashedPass, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  async hasEnoughMoney(user: UserDocument, price: number): Promise<boolean> {
    const wallet = await this.userRepository.returnWalletAmount(user.id);
    return wallet > price;
  }

  async addCredits(id: string, amount: number): Promise<UserDocument> {
    return await this.walletService.addCredits(id, amount);
  }

  async generateMockBookings(booking: Booking) {
    await this.BookingModel.create(booking);
  }
}
