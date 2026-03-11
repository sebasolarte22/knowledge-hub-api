import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  nestRestAPI(): string {
    return 'NEST REST API';
  }
}
