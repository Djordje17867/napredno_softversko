import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HotelService } from './hotel.service';
import { Roles } from '../user/decorators/roles.decorator';
import { Role } from '../user/schema/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AddHotelDto } from './dto/add.hotel.dto';
import { Hotel, HotelDocument } from './schema/hotel.schema';
import { Pagination } from '../interfaces/pagination.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileDocument } from '../files/schemas/file.schema';
import { UserDec } from '../user/decorators/user.decorator';
import { User, UserDocument } from '../user/schema/user.schema';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileUploadDto } from '../files/dto/file.upload.dto';
import { ReserveHotelDto } from './dto/reserve.hotel.dto';
import { UserIdDto } from 'src/user/dto/user.id.dto';

@ApiTags('Hotel')
@Controller('hotels')
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Roles(Role.ADMIN)
  @ApiTags('Admin')
  @ApiBearerAuth()
  @ApiBody({ type: AddHotelDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @UsePipes(new ValidationPipe())
  async addHotel(
    @Body() addHotelDto: AddHotelDto,
    @UserDec() user: User,
  ): Promise<HotelDocument> {
    const hotel: Hotel = {
      name: addHotelDto.name,
      address: addHotelDto.address,
      numOfGuests: addHotelDto.numOfGuests,
      numOfStars: addHotelDto.numOfStars,
      price: addHotelDto.price,
      availableDays: addHotelDto.availableDays,
      autoAccept: addHotelDto.autoAccept,
      skiCenterId: user.skiCenterId,
    };
    return await this.hotelService.create(hotel);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'nameSort', required: false })
  @ApiQuery({ name: 'nameFilter', required: false })
  @ApiQuery({ name: 'minStars', required: false })
  @ApiQuery({ name: 'maxStars', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'guestNum', required: false })
  @Get()
  async getAllHotels(
    @Query('perPage') perPage: number,
    @Query('page') page: number,
    @Query('nameSort') nameSort: 1 | -1,
    @Query('nameFilter') nameFilter: string,
    @Query('minStars') minStars: number,
    @Query('maxStars') maxStars: number,
    @Query('minPrice') minPrice: number,
    @Query('maxPrice') maxPrice: number,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('guestNum', ParseIntPipe) guestNum: number,
  ): Promise<Pagination<HotelDocument>> {
    return await this.hotelService.getAll(
      perPage,
      page,
      nameSort,
      nameFilter,
      minStars,
      maxStars,
      minPrice,
      maxPrice,
      dateFrom,
      dateTo,
      guestNum,
    );
  }

  @ApiTags('Admin')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('/upload')
  @ApiQuery({ name: 'name', required: false })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async addPicture(
    @Query('hotelId') hotelId: string,
    @Query('name') name: string,
    @UserDec() user: User,
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
  ): Promise<FileDocument> {
    const acl = 'public-read';
    return await this.hotelService.addPicture(hotelId, name, file, acl, user);
  }

  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiBody({ type: ReserveHotelDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('/reserve-hotel')
  @UsePipes(new ValidationPipe())
  async reserveHotel(
    @Body() reserveHotelDto: ReserveHotelDto,
    @UserDec() user: UserDocument,
  ): Promise<number> {
    if (!user.isValidated)
      throw new UnauthorizedException(
        'Please verify your email to use our services',
      );
    if (new Date(reserveHotelDto.dateTo) <= new Date(reserveHotelDto.dateFrom))
      throw new BadRequestException('Date from cannot be before date to');
    if (
      !this.hotelService.isWithinNextThreeMonths(
        new Date(reserveHotelDto.dateFrom),
      ) ||
      !this.hotelService.isWithinNextThreeMonths(
        new Date(reserveHotelDto.dateTo),
      )
    ) {
      throw new BadRequestException(
        'You can only make a reservation within next 3 months',
      );
    }
    return this.hotelService.reserveHotel(user, reserveHotelDto);
  }

  @ApiTags('Admin')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete()
  @ApiBody({ type: UserIdDto })
  async deleteHotel(
    @Body() userIdDto: UserIdDto,
    @UserDec() user: User,
  ): Promise<HotelDocument> {
    return await this.hotelService.delete(userIdDto.id, user);
  }
}
