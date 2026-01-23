import 'reflect-metadata';
import * as benny from 'benny';
import {
  container as tsyringeContainer,
  injectable as tsyringeInjectable,
  scoped as tsyringeScoped,
  Lifecycle,
} from 'tsyringe';
import { Container, register, bindTo, scope, singleton, Registration as R } from '../lib';

// TSyringe setup - Request scoped
@tsyringeScoped(Lifecycle.ContainerScoped)
class TSyringeRequestService {
  private requestId = Math.random();

  getRequestId() {
    return this.requestId;
  }
}

// ts-ioc-container setup - Request scoped
@register(bindTo('RequestService'), scope((c) => c.hasTag('request')), singleton())
class RequestService {
  private requestId = Math.random();

  getRequestId() {
    return this.requestId;
  }
}

const tsiocContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(RequestService));

// Benchmark
benny.suite(
  'Scoped Container Resolution',

  benny.add('tsyringe - create child container and resolve', () => {
    return () => {
      const childContainer = tsyringeContainer.createChildContainer();
      childContainer.resolve(TSyringeRequestService);
    };
  }),

  benny.add('ts-ioc-container - create scope and resolve', () => {
    return () => {
      const requestScope = tsiocContainer.createScope({ tags: ['request'] });
      requestScope.resolve('RequestService');
    };
  }),

  benny.cycle(),
  benny.complete(),
  benny.save({ file: 'scoped', version: '1.0.0' }),
  benny.save({ file: 'scoped', format: 'chart.html' }),
);
