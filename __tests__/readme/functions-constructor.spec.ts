import { Container, depKey, singleton } from '../../lib';

const ICarKey = depKey<
  Promise<{
    isDriving(): boolean;
    drive(): void;
    stop(): void;
  }>
>('ICar');

const ILoggerKey = depKey<
  Promise<{
    info(...messages: string[]): boolean;
  }>
>('ILogger');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const useLogger = ILoggerKey.when((s) => s.hasTag('root'))
  .to('ILogger')
  .register(async (s) => {
    await sleep(50);
    return {
      info: (...messages: string[]) => {
        return true;
      },
    };
  })
  .pipe(singleton());

const useCar = ICarKey.register(async (s) => {
  let isDriving = false;
  const logger = await ILoggerKey.resolve(s);

  return {
    isDriving: () => isDriving,

    drive: () => {
      logger.info('driving');
      isDriving = true;
    },

    stop: () => {
      isDriving = false;
    },
  };
}).pipe(singleton());

describe('function constructor', () => {
  it('should create an instance', async () => {
    const scope = new Container({ tags: ['root'] });
    scope.addRegistration(useCar);
    scope.addRegistration(useLogger);

    const car = await ICarKey.resolve(scope);

    car.drive();

    expect(car.isDriving()).toBe(true);
  });
});
