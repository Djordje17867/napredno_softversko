import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Track, TrackDocument } from './schema/track.schema';

@Injectable()
export class TrackRepository {
  constructor(
    @InjectModel('Track') private readonly trackModel: mongoose.Model<Track>,
  ) {}

  async create(track: Track): Promise<TrackDocument> {
    return await this.trackModel.create(track);
  }

  async getAll(
    perPage: number,
    page: number,
    dateSort: 1 | -1,
    nameSort: 1 | -1,
    nameFilter: RegExp | string,
    minLength: number,
    maxLength: number,
    rating: string,
    minPrice: number,
    maxPrice: number,
    daysRequired: string[],
  ): Promise<TrackDocument[]> {
    const query = await this.returnQuerry(
      nameFilter,
      minLength,
      maxLength,
      rating,
      minPrice,
      maxPrice,
      daysRequired,
    );

    return this.trackModel
      .find(query, null, {
        limit: perPage,
        skip: perPage * (page - 1) || 0,
      })
      .populate({
        path: 'bookings',
        select: 'numOfGuests dateFrom dateTo isApproved',
      })
      .sort({ name: nameSort, createdAt: dateSort });
  }

  async returnCount(): Promise<number> {
    return await this.trackModel.countDocuments();
  }

  async getCount(
    nameFilter: RegExp | string,
    minLength: number,
    maxLength: number,
    rating: string,
    minPrice: number,
    maxPrice: number,
    daysRequired: string[],
  ): Promise<number> {
    const query = await this.returnQuerry(
      nameFilter,
      minLength,
      maxLength,
      rating,
      minPrice,
      maxPrice,
      daysRequired,
    );

    return this.trackModel.countDocuments(query);
  }

  async delete(id: string): Promise<TrackDocument> {
    return this.trackModel.findByIdAndDelete(id);
  }

  async findById(id: string): Promise<TrackDocument> {
    return await this.trackModel.findById(id);
  }

  async returnQuerry(
    nameFilter: RegExp | string,
    minLength: number,
    maxLength: number,
    rating: string,
    minPrice: number,
    maxPrice: number,
    daysRequired: string[],
  ): Promise<any> {
    const query: any = {
      name: { $regex: nameFilter },
    };
    if (minLength && maxLength) {
      query.length = { $gte: minLength, $lte: maxLength };
    } else if (minLength) {
      query.length = { $gte: minLength };
    } else if (maxLength) {
      query.length = { $lte: maxLength };
    }

    if (daysRequired.length !== 0) {
      query.availableDays = { $all: daysRequired };
    }

    if (rating) query.rating = rating;
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
