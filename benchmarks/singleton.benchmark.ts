import 'reflect-metadata';
import * as benny from 'benny';
import {
  container as tsyringeContainer,
  injectable as tsyringeInjectable,
  singleton as tsyringeSingleton,
} from 'tsyringe';
import { Container, register, bindTo, singleton, Registration as R } from '../lib';

// TSyringe setup
@tsyringeSingleton()
class TSyringeSingletonService {
  private counter = 0;

  increment() {
    return ++this.counter;
  }
}

// ts-ioc-container setup
@register(bindTo('SingletonService'), singleton())
class SingletonService {
  private counter = 0;

  increment() {
    return ++this.counter;
  }
}

const tsiocContainer = new Container().addRegistration(R.fromClass(SingletonService));

// Benchmark
benny.suite(
  'Singleton Resolution',

  benny.add('tsyringe - resolve singleton (cached)', () => {
    return () => {
      tsyringeContainer.resolve(TSyringeSingletonService);
    };
  }),

  benny.add('ts-ioc-container - resolve singleton (cached)', () => {
    return () => {
      tsiocContainer.resolve('SingletonService');
    };
  }),

  benny.cycle(),
  benny.complete(),
  benny.save({ file: 'singleton', version: '1.0.0' }),
  benny.save({ file: 'singleton', format: 'chart.html' }),
);
