import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';
import { Role } from 'src/user/schema/role.enum';
import { UserService } from 'src/user/user.service';
import { faker } from '@faker-js/faker';
import { User } from 'src/user/schema/user.schema';
import { Track } from 'src/track/schema/track.schema';
import { Rating } from 'src/track/schema/rating.enum';
import { TrackService } from 'src/track/track.service';
import { Hotel } from 'src/hotel/schema/hotel.schema';
import { HotelService } from 'src/hotel/hotel.service'; 
import { Booking } from 'src/booking/schema/bookings.schema';
import { Service } from 'src/track/schema/service.enum';
import { SkiCenter } from 'src/ski-center/schema/ski-center.schema';
import { SkiCenterService } from 'src/ski-center/ski-center.service';

@Injectable()
export class DataSeed {
  constructor(
    private readonly userService: UserService,
    private readonly trackService: TrackService,
    private readonly hotelService: HotelService,
    private readonly skiCenterService: SkiCenterService,
  ) {}

  // run: npx nestjs-command create:admin
  @Command({
    command: 'seed-data',
    describe: 'seeding data for testing purposes',
  })
  async create() {
    const SkiCenters: SkiCenter[] = faker.helpers.multiple(
      this.generateSkiCenter,
      {
        count: 100,
      },
    );

    for (const skiCenter of SkiCenters) {
      await this.skiCenterService.create(skiCenter);
    }

    const USERS: User[] = faker.helpers.multiple(this.generateUser, {
      count: 2000,
    });
    for (const user of USERS) {
      await this.userService.create(user);
    }

    const Tracks: Track[] = faker.helpers.multiple(
      this.generateTrack.bind(this, SkiCenters),
      {
        count: 1200,
      },
    );
    for (const track of Tracks) {
      await this.trackService.create(track);
    }

    const Hotels: Hotel[] = faker.helpers.multiple(
      this.generateHotel.bind(this, SkiCenters),
      {
        count: 1200,
      },
    );
    for (const hotel of Hotels) {
      await this.hotelService.create(hotel);
    }
    console.log('Hotels finished');

    const TrackBookings: Booking[] = faker.helpers.multiple(
      this.generateBookings.bind(this, USERS, Tracks, Service.TRACK),
      {
        count: 2000,
      },
    );
    console.log('Tracks finished');
    const HotelBookings: Booking[] = faker.helpers.multiple(
      this.generateBookings.bind(this, USERS, Hotels, Service.HOTEL),
      {
        count: 2000,
      },
    );

    for (const booking of TrackBookings) {
      await this.userService.generateMockBookings(booking);
    }

    console.log('Track bookings finished');

    for (const booking of HotelBookings) {
      await this.userService.generateMockBookings(booking);
    }
    console.log('Hotel bookings finished');
  }

  generateSkiCenter(): SkiCenter {
    return {
      _id: faker.database.mongodbObjectId(),
      name: faker.company.name(),
      location: faker.location.country(),
      description: faker.commerce.productDescription(),
    };
  }

  generateUser(): User {
    return {
      _id: faker.database.mongodbObjectId(),
      name: faker.person.fullName(),
      username: faker.internet.userName(),
      date_of_birth: faker.date.birthdate(),
      password: 'Djole123@',
      email: faker.internet.email(),
      role: Role.USER,
      isValidated: true,
      wallet: faker.number.int({ min: 100, max: 10000 }),
    };
  }

  generateTrack(skiCenters: SkiCenter[]): Track {
    const days = this.getRandomDays(Math.floor(Math.random() * 10) + 1);
    const skiCenter = skiCenters[Math.floor(Math.random() * skiCenters.length)];
    return {
      _id: faker.database.mongodbObjectId(),
      name: faker.word.noun(),
      length: faker.number.int({ min: 50, max: 350 }),
      rating: Object.values(Rating)[faker.number.int({ min: 0, max: 4 })],
      price: faker.number.int({ min: 40, max: 120 }),
      numOfGuests: faker.number.int({ min: 6, max: 30 }),
      availableDays: days,
      autoAccept: faker.datatype.boolean(),
      skiCenterId: skiCenter._id,
    };
  }

  generateHotel(skiCenters: SkiCenter[]): Hotel {
    const days = this.getRandomDays(Math.floor(Math.random() * 10) + 1);
    const skiCenter = skiCenters[Math.floor(Math.random() * skiCenters.length)];
    return {
      _id: faker.database.mongodbObjectId(),
      name: faker.word.noun(),
      address: faker.location.streetAddress(),
      price: faker.number.int({ min: 40, max: 120 }),
      numOfGuests: faker.number.int({ min: 6, max: 30 }),
      availableDays: days,
      numOfStars: faker.number.int({ min: 1, max: 5 }),
      autoAccept: faker.datatype.boolean(),
      skiCenterId: skiCenter._id,
    };
  }

  generateBookings(
    users: User[],
    services: Track[] | Hotel[],
    serviceType: Service,
  ): Booking {
    const { dateFrom, dateTo } = this.generateDates();

    const user = users[Math.floor(Math.random() * users.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    const numOfDays = this.trackService.getNumbOfDays(dateFrom, dateTo);
    const guests = faker.number.int({ min: 1, max: 12 });
    return {
      userId: user._id,
      serviceId: service._id,
      skiCenterId: service.skiCenterId,
      value: numOfDays * guests * service.price,
      numOfGuests: guests,
      dateFrom: dateFrom,
      dateTo: dateTo,
      serviceType: serviceType,
      isApproved: faker.datatype.boolean(),
    };
  }

  getRandomDays(numOfDays: number): string[] {
    const daysOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const days: Set<string> = new Set();
    days.add('Monday');
    let i = 0;
    while (i < numOfDays) {
      const dayOfWeek = daysOfWeek[Math.floor(Math.random() * 7)];
      days.add(dayOfWeek);
      i++;
    }

    return Array.from(days);
  }

  generateDates(): { dateFrom: Date; dateTo: Date } {
    let dateFrom = faker.date.future({ years: 1 });
    let dateTo = faker.date.soon({ days: 30, refDate: dateFrom });

    if (dateFrom > dateTo) {
      [dateFrom, dateTo] = [dateTo, dateFrom];
    }
    return { dateFrom, dateTo };
  }
}
