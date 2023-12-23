import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from 'src/user/schema/user.schema';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    user: UserDocument,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.getTokens(user._id, user.role),
      this.generateString(30),
    ]);

    const hash = await bcrypt.hash(
      refreshToken,
      parseInt(this.configService.get('ROUNDS')),
    );

    await this.userService.addRefreshToken(user, hash);
    return { accessToken, refreshToken };
  }

  async logout(
    user: UserDocument,
    refreshTokenFE: string,
  ): Promise<UserDocument> {
    const matchedToken = await this.matchTokens(user, refreshTokenFE);
    return this.userService.removeRefreshToken(user, matchedToken);
  }

  async validateUser(email: string, pass: string): Promise<UserDocument> {
    const user = await this.userService.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException();
    }

    const isMatch = await this.userService.matchPassword(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async refreshTokens(id: string, refreshTokenFE: string) {
    const user = await this.userService.findUserById(id);

    if (!user) throw new ForbiddenException('Access Denied');

    const matchedToken = await this.matchTokens(user, refreshTokenFE);
    await this.userService.removeRefreshToken(user, matchedToken);
    const [accessToken, refreshToken] = await Promise.all([
      this.getTokens(user._id, user.role),
      this.generateString(30),
    ]);

    const hash = await bcrypt.hash(
      refreshToken,
      parseInt(this.configService.get('ROUNDS')),
    );

    await this.userService.addRefreshToken(user, hash);
    return { accessToken, refreshToken };
  }

  async matchTokens(
    user: UserDocument,
    refreshTokenFE: string,
  ): Promise<string> {
    let matchedToken;
    const refreshTokens = await this.userService.findUserRefreshTokens(user);
    for (const refreshToken of refreshTokens) {
      const match = await bcrypt.compare(refreshTokenFE, refreshToken.value);
      if (match) {
        matchedToken = refreshToken.value;
      }
    }

    if (!matchedToken) throw new NotFoundException();
    return matchedToken;
  }

  async logoutAll(user: UserDocument) {
    return await this.userService.logoutAll(user);
  }

  async getTokens(userId: string, role: string): Promise<string> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        role,
      },
      {
        secret: this.configService.get<string>('JWTSECRET'),
        expiresIn: '2h',
      },
    );

    return accessToken;
  }

  async generateString(length: number): Promise<string> {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
