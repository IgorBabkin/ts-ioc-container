import { forKey } from 'ts-ioc-container';

@forKey('ILogger')
export class Logger {
    info(message: string) {
        console.log(message);
    }
}
