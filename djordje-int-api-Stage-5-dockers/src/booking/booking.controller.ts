import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Pagination } from '../interfaces/pagination.interface';
import { UserDec } from '../user/decorators/user.decorator';
import { User, UserDocument } from '../user/schema/user.schema';
import { Booking, BookingDocument } from './schema/bookings.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../user/decorators/roles.decorator';
import { FilterBookings } from '../user/dto/filter.enum';
import { BookingFilter } from '../user/schema/booking.filter.enum';
import { Role } from '../user/schema/role.enum';
import { UserIdDto } from 'src/user/dto/user.id.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @UseGuards(JwtAuthGuard)
  @Get('/me')
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'dateSort', required: false })
  @ApiBearerAuth()
  async getMyRequests(
    @Query('perPage') perPage: number,
    @Query('page') page: number,
    @UserDec() user: UserDocument,
    @Query('dateSort') dateSort: 1 | -1,
  ): Promise<Pagination<Booking>> {
    return await this.bookingService.getMyBookings(
      user,
      perPage,
      page,
      dateSort,
    );
  }

  @Roles(Role.ADMIN)
  @ApiTags('Admin')
  @ApiBearerAuth()
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiQuery({ name: 'filter', required: false, enum: FilterBookings })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async getAllBookings(
    @Query('perPage') perPage: number,
    @Query('page') page: number,
    @Query('userId') userId: string,
    @Query('serviceId') serviceId: string,
    @Query('filter') filter: BookingFilter,
    @UserDec() user: User,
  ): Promise<Pagination<Booking>> {
    return await this.bookingService.getAllBookings(
      perPage,
      page,
      userId,
      serviceId,
      filter,
      user,
    );
  }

  @Roles(Role.ADMIN)
  @ApiTags('Admin')
  @ApiBearerAuth()
  @ApiBody({ type: UserIdDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('/approve')
  async approveRequest(
    @Body() userIdDTO: UserIdDto,
    @UserDec() user: User,
  ): Promise<{ message: string; deniedRequests: BookingDocument[] }> {
    return this.bookingService.approveRequest(userIdDTO.id, user);
  }

  @Roles(Role.ADMIN)
  @ApiTags('Admin')
  @ApiBearerAuth()
  @ApiBody({ type: UserIdDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('/deny')
  async denyRequest(
    @Body() userIdDTO: UserIdDto,
    @UserDec() user: User,
  ): Promise<string> {
    return this.bookingService.denyRequest(userIdDTO.id, 'admin', user);
  }

  @Roles(Role.USER)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBody({ type: UserIdDto })
  @Delete('/refund')
  async refundService(
    @Body() userIdDTO: UserIdDto,
    @UserDec() user: UserDocument,
  ): Promise<UserDocument> {
    return this.bookingService.refund(user, userIdDTO.id);
  }
}
