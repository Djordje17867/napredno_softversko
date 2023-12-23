import { Processor, Process } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { BookingService } from '../booking.service';
import { Job } from 'bull';

@Injectable()
@Processor('requests')
export class RequestConsumer {
  constructor(private readonly bookingService: BookingService) {}

  @Process()
  async expireRequest(job: Job<string>) {
    await this.bookingService.denyRequestFromQueue(job.data, 'expiration');
  }
}
