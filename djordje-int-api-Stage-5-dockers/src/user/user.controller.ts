import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User, UserDocument } from './schema/user.schema';
import { CreateUserDto } from './dto/createUserDto';
import { Role } from './schema/role.enum';
import { UserDec } from './decorators/user.decorator';
import { AuthService } from '../auth/auth.service';
import { LocalAuthGuard } from '../auth/guards/local-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Pagination } from '../interfaces/pagination.interface';
import { ChangePasswordDto } from './dto/change.password.dto';
import { ResetPasswordDto } from './dto/reset.password.dto';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiConsumes,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateAdminDto } from './dto/create.admin.dto';
import { LoginDto } from './dto/login.dto';
import { FileUploadDto } from '../files/dto/file.upload.dto';
import { addCreditsDTO } from './dto/add.credits.dto';
import { ConfirmEmailDTO } from './dto/confirm.email.dto';
import { RefreshTokenDTO } from './dto/refresh.tokens.dto';
import { UserIdDto } from './dto/user.id.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Roles(Role.ADMIN)
  @ApiTags('Admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'dateSort', required: false })
  @ApiQuery({ name: 'nameSort', required: false })
  async getAllUsers(
    @Query('perPage') perPage: number,
    @Query('page') page: number,
    @Query('dateSort') dateSort: 1 | -1,
    @Query('nameSort') nameSort: 1 | -1,
  ): Promise<Pagination<User>> {
    return await this.userService.findAll(perPage, page, dateSort, nameSort);
  }

  @Roles(Role.ADMIN)
  @ApiTags('Admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/admins')
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'dateSort', required: false })
  @ApiQuery({ name: 'nameSort', required: false })
  async getAdmins(
    @Query('perPage') perPage: number,
    @Query('page') page: number,
    @Query('dateSort') dateSort: 1 | -1,
    @Query('nameSort') nameSort: 1 | -1,
    @UserDec() user: User,
  ): Promise<Pagination<UserDocument>> {
    return await this.userService.findByRole(
      Role.ADMIN,
      perPage,
      page,
      dateSort,
      nameSort,
      user,
    );
  }

  @Roles(Role.ADMIN)
  @ApiTags('Admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/clients')
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'dateSort', required: false })
  @ApiQuery({ name: 'nameSort', required: false })
  async getUsers(
    @Query('perPage') perPage: number,
    @Query('page') page: number,
    @Query('dateSort') dateSort: 1 | -1,
    @Query('nameSort') nameSort: 1 | -1,
    @UserDec() user: User,
  ): Promise<Pagination<UserDocument>> {
    return await this.userService.findByRole(
      Role.USER,
      perPage,
      page,
      dateSort,
      nameSort,
      user,
    );
  }

  @Post('/admin')
  @ApiOperation({ security: [{ apiKey: [] }] })
  @ApiBody({ type: CreateAdminDto })
  async createAdmin(@Body() admin: CreateAdminDto): Promise<UserDocument> {
    const user: User = {
      name: admin.name,
      username: admin.username,
      date_of_birth: admin.date_of_birth,
      email: admin.email,
      password: admin.password,
      role: Role.ADMIN,
      isValidated: true,
      skiCenterId: admin.skiCenterId,
    };
    return await this.userService.create(user);
  }

  @Post()
  async registerUser(@Body() user: CreateUserDto): Promise<UserDocument> {
    const client: User = {
      name: user.name,
      username: user.username,
      date_of_birth: user.date_of_birth,
      email: user.email,
      password: user.password,
      role: Role.USER,
      isValidated: false,
    };
    return await this.userService.create(client);
  }

  @UseGuards(LocalAuthGuard)
  @ApiBody({ type: LoginDto })
  @Post('/login')
  async login(@UserDec() user: UserDocument): Promise<object> {
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('/logout')
  @ApiBody({ type: String, description: 'Add refresh token' })
  async logout(
    @Body('token') token: string,
    @UserDec() user: UserDocument,
  ): Promise<UserDocument> {
    return this.authService.logout(user, token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/logoutAll')
  async logoutAll(@UserDec() user: UserDocument): Promise<any> {
    return this.authService.logoutAll(user);
  }

  @Get('/refresh')
  @ApiBody({ type: RefreshTokenDTO })
  async refreshTokens(@Body() rfDTO: RefreshTokenDTO): Promise<object> {
    return this.authService.refreshTokens(rfDTO.id, rfDTO.refreshToken);
  }

  @Get('/confirm-email')
  @ApiBody({ type: ConfirmEmailDTO })
  async confirmEmail(
    @Body() confirmEmailDTO: ConfirmEmailDTO,
  ): Promise<string> {
    return this.userService.confirmEmail(
      confirmEmailDTO.code,
      confirmEmailDTO.id,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('/resend-email')
  async resendEmail(@UserDec() user: UserDocument): Promise<string> {
    return this.userService.resendConfEmail(user);
  }

  @Post('/addCredits')
  @ApiOperation({ security: [{ apiKey: [] }] })
  @ApiBody({ type: addCreditsDTO })
  async addCredits(
    @Body() AddCreditsDTO: addCreditsDTO,
  ): Promise<UserDocument> {
    if (!AddCreditsDTO.id || !AddCreditsDTO.amount || AddCreditsDTO.amount <= 0)
      throw new BadRequestException('Please provide correct details');
    return await this.userService.addCredits(
      AddCreditsDTO.id,
      AddCreditsDTO.amount,
    );
  }

  @Roles(Role.USER)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('/changePassword')
  @ApiBody({ type: ChangePasswordDto })
  @UsePipes(new ValidationPipe())
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @UserDec() user: UserDocument,
  ): Promise<UserDocument> {
    return await this.userService.changePassword(
      user,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  @Post('reset-password/')
  @ApiBody({ type: ResetPasswordDto })
  async confirmReset(@Body() body: ResetPasswordDto): Promise<string> {
    return await this.userService.confirmReset(body.code, body.newPassword);
  }

  @Get('reset/:email')
  @ApiParam({ name: 'email' })
  async resetPassword(@Param('email') email: string): Promise<string> {
    return await this.userService.resetPassword(email);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('/profilePicture')
  async deleteProfilePicture(@UserDec() user: UserDocument): Promise<string> {
    return await this.userService.deleteAWS(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('/me')
  async deleteMe(@UserDec() user: User) {
    return this.userService.delete(user);
  }

  @Get('/profilePicture')
  @ApiBody({ type: UserIdDto })
  async getProfilePicture(@Body() userIdDTO: UserIdDto): Promise<string> {
    return await this.userService.getProfilePicture(userIdDTO.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async addPicture(
    @UserDec() user: UserDocument,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2000000 }),
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|webp)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<string> {
    const acl = 'public-read';

    const key = await this.userService.uploadAWS(user, file.buffer, acl);
    return key;
  }
}
