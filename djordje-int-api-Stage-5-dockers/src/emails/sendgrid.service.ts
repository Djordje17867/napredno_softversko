import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SendGrid from '@sendgrid/mail';

@Injectable()
export class SendgridService {
  constructor(private readonly configService: ConfigService) {
    SendGrid.setApiKey(configService.get<string>('SEND_GRID_KEY'));
  }

  async send(mail: SendGrid.MailDataRequired) {
    const transport = await SendGrid.send(mail);

    console.log(`Email successfully dispatched to ${mail.to}`);
    return transport;
  }

  sendConfirmationEmail(email: string, code: string, id: string) {
    this.send({
      to: email,
      from: this.configService.get<string>('EMAIL_SENDER'),
      subject: 'Please confirm your email',
      dynamicTemplateData: {
        code: code,
        id: id,
      },
      templateId: 'd-bc37db091106473796f9fe55b915244a',
    });
  }

  sendResetEmail(email, code) {
    this.send({
      to: email,
      from: this.configService.get<string>('EMAIL_SENDER'),
      subject: 'Reseting your password',
      dynamicTemplateData: {
        code: code,
      },
      templateId: 'd-771d5f7854e5420c9eb0e351cd68d47f',
    });
  }

  sendApprovedEmail(
    email: string,
    username: string,
    servicename: string,
    dateFrom: string,
    dateTo: string,
  ) {
    this.send({
      to: email,
      from: this.configService.get<string>('EMAIL_SENDER'),
      subject: 'Your booking was approved!',
      dynamicTemplateData: {
        username,
        servicename,
        dateFrom,
        dateTo,
      },
      templateId: 'd-972e377182914e1fa07a98f7e0fa76f3',
    });
  }

  sendDeniedEmail(
    email: string,
    username: string,
    servicename: string,
    dateFrom: string,
    dateTo: string,
  ) {
    this.send({
      to: email,
      from: this.configService.get<string>('EMAIL_SENDER'),
      subject: 'Your booking was denied!',
      dynamicTemplateData: {
        username,
        servicename,
        dateFrom,
        dateTo,
      },
      templateId: 'd-9fa00349737f4b6c829a68a321cd106c',
    });
  }
}
