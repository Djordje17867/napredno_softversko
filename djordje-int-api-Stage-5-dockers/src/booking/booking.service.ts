import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { BookingRepository } from './booking.repository';
import { User, UserDocument } from '../user/schema/user.schema';
import { Pagination } from '../interfaces/pagination.interface';
import { Booking, BookingDocument } from './schema/bookings.schema';
import { BookingFilter } from '../user/schema/booking.filter.enum';
import { HotelService } from '../hotel/hotel.service';
import { TrackService } from '../track/track.service';
import { SendgridService } from '../emails/sendgrid.service';
import { WalletService } from '../wallet/wallet.service';
import { UserService } from '../user/user.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    @Inject(forwardRef(() => HotelService))
    private readonly hotelService: HotelService,
    @Inject(forwardRef(() => TrackService))
    private readonly trackService: TrackService,
    private readonly sendgridService: SendgridService,
    private readonly walletService: WalletService,
    private readonly userService: UserService,
    @InjectQueue('requests') private readonly bookingsQueue: Queue,
  ) {}

  async createBooking(user: UserDocument, booking: Booking) {
    const res = await this.bookingRepository.create(booking);
    this.walletService.decreseCredits(user, res.value);
    await this.bookingsQueue.add(res._id, {
      delay: 24 * 60 * 60 * 1000,
    });
  }

  async getMyBookings(
    user: UserDocument,
    perPage: number,
    page: number,
    dateSort: 1 | -1,
  ): Promise<Pagination<BookingDocument>> {
    const options = {
      limit: perPage,
      skip: perPage * (page - 1) || 0,
    };
    const [bookings, numbookings] = await Promise.all([
      this.bookingRepository.find(user.id, options, dateSort),
      this.bookingRepository.countDocuments({ userId: user.id }),
    ]);

    const pagination: Pagination<BookingDocument> = {
      items: bookings,
      totalItems: numbookings,
    };
    return pagination;
  }

  async getAllBookings(
    perPage: number,
    page: number,
    userId: string,
    serviceId: string,
    filter: BookingFilter,
    user: User,
  ): Promise<Pagination<BookingDocument>> {
    const options = {
      limit: perPage,
      skip: perPage * (page - 1) || 0,
    };

    const query: any = { skiCenterId: user.skiCenterId };
    if (userId) query.userId = userId;
    if (serviceId) query.serviceId = serviceId;

    switch (filter) {
      case 'pending':
        query.isApproved = false;
        break;
      case 'approved':
        query.isApproved = true;
        break;
      case 'expired':
        query.cancelledBy = 'expiration';
        query.isCancelled = true;
        break;
      case 'finished':
        query.dateTo = { $lte: new Date() };
        break;
    }

    const [bookings, numBookings] = await Promise.all([
      this.bookingRepository.findAllBookings(query, options, null),
      this.bookingRepository.countDocuments(query),
    ]);

    const pagination: Pagination<BookingDocument> = {
      items: bookings,
      totalItems: numBookings,
    };
    return pagination;
  }

  async approveRequest(
    id: string,
    admin: User,
  ): Promise<{ message: string; deniedRequests: BookingDocument[] }> {
    const booking = await this.bookingRepository.findOneAndUpdate(
      { _id: id, skiCenterId: admin.skiCenterId },
      { isApproved: true },
      { new: true },
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const [pendingReq, approvedReq, user, service] = await Promise.all([
      this.bookingRepository.findQuery({
        serviceId: booking.serviceId,
        $or: [
          {
            dateFrom: { $lte: booking.dateFrom },
            dateTo: { $gte: booking.dateFrom },
          },
          {
            dateFrom: { $lte: booking.dateTo },
            dateTo: { $gte: booking.dateTo },
          },
        ],
        isApproved: false,
      }),
      this.bookingRepository.findQuery({
        serviceId: booking.serviceId,
        $or: [
          {
            dateFrom: { $lte: booking.dateFrom },
            dateTo: { $gte: booking.dateFrom },
          },
          {
            dateFrom: { $lte: booking.dateTo },
            dateTo: { $gte: booking.dateTo },
          },
        ],
        isApproved: true,
      }),
      this.userService.findUserById(booking.userId),
      booking.serviceType === 'track'
        ? this.trackService.findById(booking.serviceId)
        : this.hotelService.findById(booking.serviceId),
    ]);

    pendingReq.filter(async (pending) => {
      const pendingReqUestDates = await this.hotelService.getArrayOfDates(
        pending.dateFrom,
        pending.dateTo,
      );

      for (const date of pendingReqUestDates) {
        const numOfGuests = approvedReq
          .filter((booking) => {
            return booking.dateFrom <= date && booking.dateTo >= date;
          })
          .reduce((acc, curValue) => (acc += curValue.numOfGuests), 0);
        if (numOfGuests + booking.numOfGuests > service.numOfGuests) {
          await this.denyRequest(pending.id, 'overBooking', null);
          return true;
        }
      }
      return false;
    });

    this.sendgridService.sendApprovedEmail(
      user.email,
      user.name,
      service.name,
      booking.dateFrom.toISOString().split('T')[0],
      booking.dateTo.toISOString().split('T')[0],
    );

    return {
      message: `Request approved and email sent to ${user.email}`,
      deniedRequests: pendingReq,
    };
  }

  async denyRequest(id: string, reason: string, admin: User): Promise<string> {
    const query: any = { _id: id };
    if (admin) {
      query.skiCenterId = admin.skiCenterId;
    }
    const booking = await this.bookingRepository.findOneAndUpdate(
      query,
      {
        isCancelled: true,
        cancelledBy: reason,
      },
      { new: true },
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    this.walletService.addCredits(booking.userId, booking.value);

    const [user, service] = await Promise.all([
      this.userService.findUserById(booking.userId),
      booking.serviceType === 'track'
        ? this.trackService.findById(booking.serviceId)
        : this.hotelService.findById(booking.serviceId),
    ]);

    this.sendgridService.sendDeniedEmail(
      user.email,
      user.name,
      service.name,
      booking.dateFrom.toISOString().split('T')[0],
      booking.dateTo.toISOString().split('T')[0],
    );
    return 'Request denied succesfully';
  }

  async refund(user: UserDocument, id: string): Promise<UserDocument> {
    const booking = await this.bookingRepository.findOne({
      _id: id,
      userId: user.id,
    });
    if (!booking) {
      throw new NotFoundException();
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (booking.dateFrom <= tomorrow) {
      throw new BadRequestException(
        'You cant cancel a day before your reservation',
      );
    }

    await this.bookingRepository.findOneAndUpdate(
      {
        userId: user.id,
        _id: id,
      },
      { isCancelled: true, cancelledBy: 'user' },
      { new: true },
    );
    return await this.walletService.addCredits(user.id, booking.value);
  }

  async denyRequestFromQueue(id: string, reason: string): Promise<string> {
    const query: any = { _id: id };
    const booking = await this.bookingRepository.findOneAndUpdate(
      query,
      {
        isCancelled: true,
        cancelledBy: reason,
      },
      { new: true },
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    this.walletService.addCredits(booking.userId, booking.value);

    const [user, service] = await Promise.all([
      this.userService.findUserById(booking.userId),
      booking.serviceType === 'track'
        ? this.trackService.findById(booking.serviceId)
        : this.hotelService.findById(booking.serviceId),
    ]);

    this.sendgridService.sendDeniedEmail(
      user.email,
      user.name,
      service.name,
      booking.dateFrom.toISOString().split('T')[0],
      booking.dateTo.toISOString().split('T')[0],
    );
    return 'Request denied succesfully';
  }

  async getBookings(query: {
    serviceId: string;
    isApproved: boolean;
    dateFrom: { $lte: Date };
    dateTo: { $gte: Date };
  }): Promise<BookingDocument[]> {
    return this.bookingRepository.findQuery(query);
  }
}
