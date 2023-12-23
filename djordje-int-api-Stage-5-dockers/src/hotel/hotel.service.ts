import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Hotel, HotelDocument } from './schema/hotel.schema';
import { HotelRepository } from './hotel.repository';
import { Pagination } from '../interfaces/pagination.interface';
import { ReserveHotelDto } from './dto/reserve.hotel.dto';
import { Booking } from '../booking/schema/bookings.schema';
import { Service } from '../track/schema/service.enum';
import { FilesService } from '../files/files.service';
import { AWSService } from '../aws/aws.service';
import { File, FileDocument } from '../files/schemas/file.schema';
import { User, UserDocument } from '../user/schema/user.schema';
import { SendgridService } from '../emails/sendgrid.service';
import { UserService } from '../user/user.service';
import { BookingService } from '../booking/booking.service';

@Injectable()
export class HotelService {
  constructor(
    private readonly hotelRepository: HotelRepository,
    private readonly fileService: FilesService,
    private readonly awsService: AWSService,
    private readonly sendgridService: SendgridService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => BookingService))
    private bookingService: BookingService,
  ) {}

  async create(hotel: Hotel): Promise<HotelDocument> {
    return this.hotelRepository.create(hotel);
  }

  async reserveHotel(
    user: UserDocument,
    reserveHotelDto: ReserveHotelDto,
  ): Promise<number> {
    const daysRequired = await this.getDaysOfWeek(
      reserveHotelDto.dateFrom,
      reserveHotelDto.dateTo,
    );

    const dateTo = new Date(reserveHotelDto.dateTo);
    const dateFrom = new Date(reserveHotelDto.dateFrom);

    if (dateFrom > dateTo) throw new BadRequestException('Wrong dates');

    const hotel = await this.hotelRepository.findById(reserveHotelDto.id);
    if (!hotel) throw new NotFoundException('Hotel not found');

    for (const day of daysRequired) {
      if (!hotel.availableDays.includes(day)) {
        throw new NotFoundException('Couldnt book for required days');
      }
    }

    const dates = await this.getArrayOfDates(dateFrom, dateTo);

    for (const date of dates) {
      const bookingsForADate = await this.bookingService.getBookings({
        serviceId: hotel.id,
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

      if (numOfGuests + reserveHotelDto.numOfGuests > hotel.numOfGuests) {
        throw new BadRequestException('Couldnt book, not enough space');
      }
    }

    const numberOfDays = await this.getNumbOfDays(dateFrom, dateTo);

    const fullPrice = numberOfDays * hotel.price * reserveHotelDto.numOfGuests;
    if (!(await this.userService.hasEnoughMoney(user, fullPrice)))
      throw new BadRequestException('Not enough money');

    const booking: Booking = {
      userId: user.id,
      serviceId: hotel.id,
      skiCenterId: hotel.skiCenterId,
      value: fullPrice,
      numOfGuests: reserveHotelDto.numOfGuests,
      dateFrom: dateFrom,
      dateTo: dateTo,
      serviceType: Service.HOTEL,
      isApproved: hotel.autoAccept ? true : false,
    };

    if (hotel.autoAccept) {
      this.sendgridService.sendApprovedEmail(
        user.email,
        user.username,
        hotel.name,
        reserveHotelDto.dateFrom,
        reserveHotelDto.dateTo,
      );
    }

    await this.bookingService.createBooking(user, booking);
    return fullPrice;
  }

  async getAll(
    perPage: number,
    page: number,
    nameSort: 1 | -1,
    nameFilter: string,
    minStars: number,
    maxStars: number,
    minPrice: number,
    maxPrice: number,
    dateFrom: string,
    dateTo: string,
    guestNum: number,
  ): Promise<Pagination<HotelDocument>> {
    const daysRequired = await this.getDaysOfWeek(dateFrom, dateTo);

    const DateTo = new Date(dateTo);
    const DateFrom = new Date(dateFrom);

    if (dateFrom > dateTo) throw new BadRequestException('Wrong dates');

    const dates = await this.getArrayOfDates(DateFrom, DateTo);

    await this.validatePagination(perPage, page);
    const filterRegex = new RegExp(nameFilter, 'i' || '');
    // eslint-disable-next-line prefer-const
    let [hotels, numHotels] = await Promise.all([
      this.hotelRepository.getAll(
        perPage,
        page,
        nameSort,
        filterRegex,
        minStars,
        maxStars,
        minPrice,
        maxPrice,
        daysRequired,
      ),
      this.hotelRepository.returnCountQuerry(
        filterRegex,
        minStars,
        maxStars,
        minPrice,
        maxPrice,
        daysRequired,
      ),
    ]);

    if (!hotels)
      throw new NotFoundException('No hotels that match your search');

    const newHotels = hotels.filter((hotel) => {
      for (const date of dates) {
        const numOfGuests = hotel.bookings
          .filter((booking) => {
            return (
              booking.dateFrom <= date &&
              booking.dateTo >= date &&
              booking.isApproved === true
            );
          })
          .reduce((acc, curValue) => (acc += curValue.numOfGuests), 0);
        const aggGuests = numOfGuests + guestNum;
        if (hotel.numOfGuests < aggGuests) {
          numHotels--;
          // Error when you paginate, it doesnt return correct count, because it
          //only decreases number for those ex 50 u return from database
          return false;
        }
      }
      return true;
    });

    const hotelsWithoutBookings = newHotels.map((hotel) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { bookings, ...hotelWithoutBookings } = hotel.toObject();
      return hotelWithoutBookings;
    });

    const pagination: Pagination<HotelDocument> = {
      items: hotelsWithoutBookings,
      totalItems: numHotels,
    };
    return pagination;
  }

  async addPicture(
    hotelId: string,
    name: string,
    file: Express.Multer.File,
    acl: string,
    user: User,
  ): Promise<FileDocument> {
    const hotel = await this.hotelRepository.findById(hotelId);
    if (!hotel) throw new NotFoundException('Hotel not found');

    if (user.skiCenterId !== hotel.skiCenterId) {
      throw new BadRequestException('Cannot upload');
    }
    let fileName: string;
    if (name) {
      const extention = file.mimetype.split('/')[1];
      fileName = `hotels/${hotelId}/${name}.${extention}`;
    } else {
      fileName = `hotels/${hotelId}/${file.originalname}`;
    }
    const key = await this.awsService.uploadAWS(fileName, file.buffer, acl);
    const fileDB: File = {
      serviceId: hotelId,
      type: file.mimetype,
      name,
      key,
    };
    return await this.fileService.addPicture(fileDB);
  }

  async delete(id: string, user: User): Promise<HotelDocument> {
    const hotel = await this.hotelRepository.findById(id);
    if (user.skiCenterId !== hotel.skiCenterId) {
      throw new BadRequestException('Cannot delete');
    }
    return await this.hotelRepository.delete(id);
  }

  async validatePagination(perPage: number, page: number) {
    if (perPage < 1 || page < 1) {
      throw new BadRequestException('Pagination not valid');
    }
  }

  async getNumbOfDays(dateFrom: Date, dateTo: Date): Promise<number> {
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

  async findById(id: string): Promise<HotelDocument> {
    return this.hotelRepository.findById(id);
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
