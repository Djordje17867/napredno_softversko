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
import { TrackService } from './track.service';
import { Roles } from '../user/decorators/roles.decorator';
import { Role } from '../user/schema/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Track, TrackDocument } from './schema/track.schema';
import { Pagination } from '../interfaces/pagination.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateTrackDto } from './dto/create.track.dto';
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
import { ReserveTrackDto } from './dto/reserve.track.dto';
import { UserIdDto } from 'src/user/dto/user.id.dto';

@ApiTags('Tracks')
@Controller('tracks')
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @ApiTags('Admin')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiBody({ type: CreateTrackDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @UsePipes(new ValidationPipe())
  async addTrack(
    @Body() createTrackDto: CreateTrackDto,
    @UserDec() user: User,
  ): Promise<TrackDocument> {
    const track: Track = {
      name: createTrackDto.name,
      length: createTrackDto.length,
      rating: createTrackDto.rating,
      price: createTrackDto.price,
      numOfGuests: createTrackDto.numOfGuests,
      availableDays: createTrackDto.availableDays,
      autoAccept: createTrackDto.autoAccept,
      skiCenterId: user.skiCenterId,
    };
    return await this.trackService.create(track);
  }

  @Roles(Role.USER)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('/reserve-track')
  @UsePipes(new ValidationPipe())
  @ApiBody({ type: ReserveTrackDto })
  async reserveTrack(
    @Body() reserveTrackDto: ReserveTrackDto,
    @UserDec() user: UserDocument,
  ): Promise<number> {
    if (!user.isValidated)
      throw new UnauthorizedException(
        'Please verify your email to use our services',
      );
    if (new Date(reserveTrackDto.dateTo) <= new Date(reserveTrackDto.dateFrom))
      throw new BadRequestException('Date from cannot be before date to');
    if (
      !this.trackService.isWithinNextThreeMonths(
        new Date(reserveTrackDto.dateFrom),
      ) ||
      !this.trackService.isWithinNextThreeMonths(
        new Date(reserveTrackDto.dateTo),
      )
    ) {
      throw new BadRequestException(
        'You can only make a reservation within next 3 months',
      );
    }
    return this.trackService.reserveTrack(user, reserveTrackDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'dateSort', required: false })
  @ApiQuery({ name: 'nameSort', required: false })
  @ApiQuery({ name: 'nameFilter', required: false })
  @ApiQuery({ name: 'minLength', required: false })
  @ApiQuery({ name: 'maxLength', required: false })
  @ApiQuery({ name: 'rating', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'guestNum', required: false })
  async getAllTracks(
    @Query('perPage') perPage: number,
    @Query('page') page: number,
    @Query('dateSort') dateSort: 1 | -1,
    @Query('nameSort') nameSort: 1 | -1,
    @Query('nameFilter') nameFilter: string,
    @Query('minLength') minLength: number,
    @Query('maxLength') maxLength: number,
    @Query('rating') rating: string,
    @Query('minPrice') minPrice: number,
    @Query('maxPrice') maxPrice: number,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,

    @Query('guestNum', ParseIntPipe) guestNum: number,
    
  ): Promise<Pagination<TrackDocument>> {
    return this.trackService.getAll(
      perPage,
      page,
      dateSort,
      nameSort,
      nameFilter,
      minLength,
      maxLength,
      rating,
      minPrice,
      maxPrice,
      dateFrom,
      dateTo,
      guestNum,
    );
  }

  @ApiTags('Admin')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  @ApiQuery({ name: 'name', required: false })
  async addPicture(
    @Query('trackId') trackId: string,
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
    return await this.trackService.addPicture(trackId, name, file, acl, user);
  }

  @ApiTags('Admin')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete()
  @ApiBody({ type: UserIdDto })
  async deleteTrack(
    @Body() userIdDTO: UserIdDto,
    @UserDec() user: User,
  ): Promise<TrackDocument> {
    return await this.trackService.delete(userIdDTO.id, user);
  }
}
