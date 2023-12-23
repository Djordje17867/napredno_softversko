import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Hotel, HotelDocument } from './schema/hotel.schema';

@Injectable()
export class HotelRepository {
  constructor(
    @InjectModel('Hotel')
    private hotelModel: mongoose.Model<Hotel>,
  ) {}

  async create(hotel: Hotel): Promise<HotelDocument> {
    return this.hotelModel.create(hotel);
  }

  async findById(id: string): Promise<HotelDocument> {
    return await this.hotelModel.findById(id);
  }

  async getAll(
    perPage: number,
    page: number,
    nameSort: 1 | -1,
    nameFilter: RegExp | string,
    minStars: number,
    maxStars: number,
    minPrice: number,
    maxPrice: number,
    daysRequired: string[],
  ): Promise<HotelDocument[]> {
    const query = await this.returnQuerry(
      nameFilter,
      minStars,
      maxStars,
      minPrice,
      maxPrice,
      daysRequired,
    );

    return this.hotelModel
      .find(query, null, {
        limit: perPage,
        skip: perPage * (page - 1) || 0,
      })
      .populate({
        path: 'bookings',
        select: 'numOfGuests dateFrom dateTo isApproved',
      })
      .sort({ name: nameSort });
  }

  async returnCountQuerry(
    nameFilter: RegExp | string,
    minStars: number,
    maxStars: number,
    minPrice: number,
    maxPrice: number,
    daysRequired: string[],
  ): Promise<number> {
    const query = await this.returnQuerry(
      nameFilter,
      minStars,
      maxStars,
      minPrice,
      maxPrice,
      daysRequired,
    );

    return this.hotelModel.countDocuments(query);
  }

  async delete(id: string): Promise<HotelDocument> {
    return this.hotelModel.findByIdAndDelete(id);
  }

  async returnCount(): Promise<number> {
    return await this.hotelModel.countDocuments();
  }

  async returnQuerry(
    nameFilter: RegExp | string,
    minStars: number,
    maxStars: number,
    minPrice: number,
    maxPrice: number,
    daysRequired: string[],
  ): Promise<any> {
    const query: any = {
      name: { $regex: nameFilter },
    };

    if (minStars && maxStars) {
      query.numOfStars = { $gte: minStars, $lte: maxStars };
    } else if (minStars) {
      query.numOfStars = { $gte: minStars };
    } else if (maxStars) {
      query.numOfStars = { $lte: maxStars };
    }

    if (daysRequired.length !== 0) {
      query.availableDays = { $all: daysRequired };
    }

    if (minPrice && maxPrice) {
      query.price = { $gte: minPrice, $lte: maxPrice };
    } else if (minPrice) {
      query.price = { $gte: minPrice };
    } else if (maxPrice) {
      query.price = { $lte: maxPrice };
    }
    return query;
  }
}
