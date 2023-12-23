import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Track, TrackDocument } from './schema/track.schema';
import { TrackRepository } from './track.repository';
import { Pagination } from 'src/interfaces/pagination.interface';
import { ReserveTrackDto } from './dto/reserve.track.dto';
import { Booking } from '../booking/schema/bookings.schema';
import { Service } from './schema/service.enum';
import { AWSService } from '../aws/aws.service';
import { FilesService } from '../files/files.service';
import { File, FileDocument } from '../files/schemas/file.schema';
import { SendgridService } from '../emails/sendgrid.service';
import { User, UserDocument } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { BookingService } from '../booking/booking.service';

@Injectable()
export class TrackService {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly awsService: AWSService,
    private readonly fileService: FilesService,
    private readonly sendgridService: SendgridService,
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
    private readonly userService: UserService,
  ) {}

  async create(track: Track): Promise<TrackDocument> {
    return await this.trackRepository.create(track);
  }

  async reserveTrack(
    user: UserDocument,
    reserveTrackDto: ReserveTrackDto,
  ): Promise<number> {
    const dateTo = new Date(reserveTrackDto.dateTo);
    const dateFrom = new Date(reserveTrackDto.dateFrom);

    const daysRequired = await this.getDaysOfWeek(
      reserveTrackDto.dateFrom,
      reserveTrackDto.dateTo,
    );

    if (dateFrom > dateTo) throw new BadRequestException('Wrong dates');

    const track = await this.trackRepository.findById(reserveTrackDto.id);

    if (!track) throw new NotFoundException('Track not found');

    for (const day of daysRequired) {
      if (!track.availableDays.includes(day)) {
        throw new NotFoundException('Couldnt book');
      }
    }

    const dates = await this.getArrayOfDates(dateFrom, dateTo);

    for (const date of dates) {
      const bookingsForADate = await this.bookingService.getBookings({
        serviceId: track.id,
        isApproved: true,
        dateFrom: { $lte: date },
        dateTo: { $gte: date },
      });
      const numOfGuests = bookingsForADate.reduce(
        (accumulator, currentValue) => {
          return accumulator + currentValue.numOfGuests;
        },
        0,
      );
      if (numOfGuests + reserveTrackDto.numOfGuests > track.numOfGuests) {
        throw new BadRequestException('Couldnt book, not enough space');
      }
    }

    const numberOfDays = await this.getNumbOfDays(dateFrom, dateTo);

    const fullPrice = numberOfDays * track.price * reserveTrackDto.numOfGuests;
    if (!(await this.userService.hasEnoughMoney(user, fullPrice)))
      throw new BadRequestException('Not enough money');

    const booking: Booking = {
      userId: user.id,
      serviceId: track.id,
      skiCenterId: track.skiCenterId,
      value: fullPrice,
      numOfGuests: reserveTrackDto.numOfGuests,
      dateFrom: dateFrom,
      dateTo: dateTo,
      serviceType: Service.TRACK,
      isApproved: track.autoAccept ? true : false,
    };

    await this.bookingService.createBooking(user, booking);

    if (track.autoAccept) {
      this.sendgridService.sendApprovedEmail(
        user.email,
        user.username,
        track.name,
        reserveTrackDto.dateFrom,
        reserveTrackDto.dateTo,
      );
    }

    return fullPrice;
  }

  async getAll(
    perPage: number,
    page: number,
    dateSort: 1 | -1,
    nameSort: 1 | -1,
    nameFilter: string,
    minLength: number,
    maxLength: number,
    rating: string,
    minPrice: number,
    maxPrice: number,
    dateFrom: string,
    dateTo: string,
    guestNum: number,
  ): Promise<Pagination<TrackDocument>> {
    const daysRequired = await this.getDaysOfWeek(dateFrom, dateTo);

    const DateTo = new Date(dateTo);
    const DateFrom = new Date(dateFrom);

    if (dateFrom > dateTo) throw new BadRequestException('Wrong dates');

    const dates = await this.getArrayOfDates(DateFrom, DateTo);

    await this.validatePagination(perPage, page);
    perPage = perPage > 50 ? 50 : perPage;
    const filterRegex = new RegExp(nameFilter, 'i' || '');
    // eslint-disable-next-line prefer-const
    let [tracks, numTracks] = await Promise.all([
      this.trackRepository.getAll(
        perPage,
        page,
        dateSort,
        nameSort,
        filterRegex,
        minLength,
        maxLength,
        rating,
        minPrice,
        maxPrice,
        daysRequired,
      ),
      this.trackRepository.getCount(
        filterRegex,
        minLength,
        maxLength,
        rating,
        minPrice,
        maxPrice,
        daysRequired,
      ),
    ]);

    const newTracks = tracks.filter((track) => {
      for (const date of dates) {
        const numOfGuests = track.bookings
          .filter((booking) => {
            return (
              booking.dateFrom <= date &&
              booking.dateTo >= date &&
              booking.isApproved === true
            );
          })
          .reduce((acc, curValue) => (acc += curValue.numOfGuests), 0);
        const aggGuests = numOfGuests + guestNum;
        if (track.numOfGuests < aggGuests) {
          // Error when you paginate, it doesnt return correct count, because it
          //only decreases number for those ex 50 u return from database
          numTracks--;
          return false;
        }
      }
      return true;
    });

    const tracksWithoutBooking = newTracks.map((track) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { bookings, ...trackWithoutBooking } = track.toObject();
      return trackWithoutBooking;
    });

    const pagination: Pagination<TrackDocument> = {
      items: tracksWithoutBooking,
      totalItems: numTracks,
    };
    return pagination;
  }

  async delete(id: string, user: User): Promise<TrackDocument> {
    const track = await this.trackRepository.findById(id);

    if (user.skiCenterId !== track.skiCenterId) {
      throw new BadRequestException('Cannot delete');
    }

    return await this.trackRepository.delete(id);
  }

  async validatePagination(perPage: number, page: number) {
    if (perPage < 1 || page < 1) {
      throw new BadRequestException('Pagination not valid');
    }
  }

  getNumbOfDays(dateFrom: Date, dateTo: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;

    const utcDateFrom = Date.UTC(
      dateFrom.getFullYear(),
      dateFrom.getMonth(),
      dateFrom.getDate(),
    );
    const utcDateTo = Date.UTC(
      dateTo.getFullYear(),
      dateTo.getMonth(),
      dateTo.getDate(),
    );

    const diffInDays = Math.floor((utcDateTo - utcDateFrom) / oneDay);

    return diffInDays;
  }

  async addPicture(
    trackId: string,
    name: string,
    file: Express.Multer.File,
    acl: string,
    user: User,
  ): Promise<FileDocument> {
    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new NotFoundException('Track not found');

    if (user.skiCenterId !== track.skiCenterId) {
      throw new BadRequestException('Cannot upload');
    }

    let fileName: string;
    if (name) {
      const extention = file.mimetype.split('/')[1];
      fileName = `tracks/${trackId}/${name}.${extention}`;
    } else {
      fileName = `tracks/${trackId}/${file.originalname}`;
    }
    const key = await this.awsService.uploadAWS(fileName, file.buffer, acl);
    const fileDB: File = {
      serviceId: trackId,
      type: file.mimetype,
      name,
      key,
    };
    return await this.fileService.addPicture(fileDB);
  }

  async findById(id: string): Promise<TrackDocument> {
    return this.trackRepository.findById(id);
  }

  async getDaysOfWeek(dateFrom: string, dateTo: string): Promise<string[]> {
    const daysOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    const days: Set<string> = new Set();

    while (startDate < endDate) {
      const dayOfWeek = daysOfWeek[startDate.getDay()];
      days.add(dayOfWeek);
      startDate.setDate(startDate.getDate() + 1);
    }

    return Array.from(days);
  }

  async getArrayOfDates(dateFrom: Date, dateTo: Date): Promise<Date[]> {
    const arrayOfDates: Date[] = [];
    const currentDate = new Date(dateFrom);

    while (currentDate <= dateTo) {
      arrayOfDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return arrayOfDates;
  }

  isWithinNextThreeMonths(date: Date): boolean {
    const currentDate = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(currentDate.getMonth() + 3);

    return date >= currentDate && date <= threeMonthsLater;
  }
}
