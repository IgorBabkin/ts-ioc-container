import 'reflect-metadata';
import * as benny from 'benny';
import { container as tsyringeContainer, injectable as tsyringeInjectable } from 'tsyringe';
import { Container, register, bindTo, Registration as R } from '../lib';

// TSyringe setup - Multiple transient services
@tsyringeInjectable()
class TSyringeTransientService {
  private id = Math.random();

  getId() {
    return this.id;
  }
}

// ts-ioc-container setup - Multiple transient services
@register(bindTo('TransientService'))
class TransientService {
  private id = Math.random();

  getId() {
    return this.id;
  }
}

const tsiocContainer = new Container().addRegistration(R.fromClass(TransientService));

// Benchmark
benny.suite(
  'Multiple Resolutions (Transient)',

  benny.add('tsyringe - resolve 100 times', () => {
    return () => {
      for (let i = 0; i < 100; i++) {
        tsyringeContainer.resolve(TSyringeTransientService);
      }
    };
  }),

  benny.add('ts-ioc-container - resolve 100 times', () => {
    return () => {
      for (let i = 0; i < 100; i++) {
        tsiocContainer.resolve('TransientService');
      }
    };
  }),

  benny.cycle(),
  benny.complete(),
  benny.save({ file: 'multiple-resolutions', version: '1.0.0' }),
  benny.save({ file: 'multiple-resolutions', format: 'chart.html' }),
);
