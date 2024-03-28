import { key } from 'ts-ioc-container';

@key('ILogger')
export class Logger {
  info(message: string) {
    console.log(message);
  }
}
