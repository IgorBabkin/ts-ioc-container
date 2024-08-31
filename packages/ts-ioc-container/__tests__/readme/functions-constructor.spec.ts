import { Container, depKey, MetadataInjector, singleton } from '../../lib';

const ICarKey = depKey<
  Promise<{
    isDriving(): boolean;
    drive(): void;
    stop(): void;
  }>
>();

const ILoggerKey = depKey<
  Promise<{
    info(...messages: string[]): boolean;
  }>
>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const useLogger = ILoggerKey.register(async (s) => {
  await sleep(50);
  return {
    info: (...messages: string[]) => {
      console.log(...messages);
      return true;
    },
  };
}).pipe(singleton());

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
    const scope = new Container(new MetadataInjector(), { tags: ['root'] });
    scope.add(useCar);
    scope.add(useLogger);

    const car = await ICarKey.resolve(scope);

    car.drive();

    expect(car.isDriving()).toBe(true);
  });
});
