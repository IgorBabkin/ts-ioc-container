import 'reflect-metadata';
import * as benny from 'benny';
import { container as tsyringeContainer, injectable as tsyringeInjectable } from 'tsyringe';
import { Container, register, bindTo, Registration as R } from '../lib';

// TSyringe setup
@tsyringeInjectable()
class TSyringeSimpleService {
  getValue() {
    return 'simple value';
  }
}

tsyringeContainer.register('TSyringeSimpleService', {
  useClass: TSyringeSimpleService,
});

// ts-ioc-container setup
@register(bindTo('SimpleService'))
class SimpleService {
  getValue() {
    return 'simple value';
  }
}

const tsiocContainer = new Container().addRegistration(R.fromClass(SimpleService));

// Benchmark
benny.suite(
  'Simple Dependency Resolution',

  benny.add('tsyringe - resolve simple service', () => {
    return () => {
      tsyringeContainer.resolve(TSyringeSimpleService);
    };
  }),

  benny.add('ts-ioc-container - resolve simple service', () => {
    return () => {
      tsiocContainer.resolve('SimpleService');
    };
  }),

  benny.cycle(),
  benny.complete(),
  benny.save({ file: 'simple-resolution', version: '1.0.0' }),
  benny.save({ file: 'simple-resolution', format: 'chart.html' }),
);
