import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { MongoError } from '../../node_modules/mongodb';
@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: MongoError, host: ArgumentsHost) {
    let message: string, statusCode: number;
    console.error('Mongo Exception', exception);
    switch (exception.code) {
      case 11000: {
        statusCode = HttpStatus.CONFLICT;
        message = `Duplicate error: ${exception.message.match(/".*"/)}`;
        break;
      }
      default: {
        message = 'Internal server error';
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      }
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    return response.status(statusCode).json({
      message,
      statusCode,
    });
  }
}
