import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command } from 'nestjs-command';
import { Role } from 'src/user/schema/role.enum';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AdminSeed {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  // run: npx nestjs-command create:admin
  @Command({
    command: 'create:admin',
    describe: 'create ski center admin',
  })
  async create() {
    const admin = await this.userService.create({
      name: 'admin',
      username: 'admin',
      email: this.configService.get<string>('ADMIN_EMAIL'),
      date_of_birth: new Date(),
      password: this.configService.get<string>('ADMIN_PASSWORD'),
      role: Role.ADMIN,
      resetCode: undefined,
      isValidated: true,
      skiCenterId: '8fa2363cb11f478ebb96a2af',
    });
    console.log(admin);
  }
}
