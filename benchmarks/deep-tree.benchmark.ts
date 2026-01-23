import 'reflect-metadata';
import * as benny from 'benny';
import { container as tsyringeContainer, injectable as tsyringeInjectable, inject as tsyringeInject } from 'tsyringe';
import { Container, register, bindTo, inject, Registration as R } from '../lib';

// TSyringe setup - Deep dependency tree
@tsyringeInjectable()
class TSyringeLeafService {
  getName() {
    return 'leaf';
  }
}

@tsyringeInjectable()
class TSyringeLevel3Service {
  constructor(@tsyringeInject(TSyringeLeafService) private leaf: TSyringeLeafService) {}

  getData() {
    return this.leaf.getName();
  }
}

@tsyringeInjectable()
class TSyringeLevel2Service {
  constructor(@tsyringeInject(TSyringeLevel3Service) private level3: TSyringeLevel3Service) {}

  getData() {
    return this.level3.getData();
  }
}

@tsyringeInjectable()
class TSyringeLevel1Service {
  constructor(@tsyringeInject(TSyringeLevel2Service) private level2: TSyringeLevel2Service) {}

  getData() {
    return this.level2.getData();
  }
}

@tsyringeInjectable()
class TSyringeRootService {
  constructor(@tsyringeInject(TSyringeLevel1Service) private level1: TSyringeLevel1Service) {}

  getData() {
    return this.level1.getData();
  }
}

// ts-ioc-container setup - Deep dependency tree
@register(bindTo('LeafService'))
class LeafService {
  getName() {
    return 'leaf';
  }
}

@register(bindTo('Level3Service'))
class Level3Service {
  constructor(@inject('LeafService') private leaf: LeafService) {}

  getData() {
    return this.leaf.getName();
  }
}

@register(bindTo('Level2Service'))
class Level2Service {
  constructor(@inject('Level3Service') private level3: Level3Service) {}

  getData() {
    return this.level3.getData();
  }
}

@register(bindTo('Level1Service'))
class Level1Service {
  constructor(@inject('Level2Service') private level2: Level2Service) {}

  getData() {
    return this.level2.getData();
  }
}

@register(bindTo('RootService'))
class RootService {
  constructor(@inject('Level1Service') private level1: Level1Service) {}

  getData() {
    return this.level1.getData();
  }
}

const tsiocContainer = new Container()
  .addRegistration(R.fromClass(LeafService))
  .addRegistration(R.fromClass(Level3Service))
  .addRegistration(R.fromClass(Level2Service))
  .addRegistration(R.fromClass(Level1Service))
  .addRegistration(R.fromClass(RootService));

// Benchmark
benny.suite(
  'Deep Dependency Tree Resolution',

  benny.add('tsyringe - resolve deep tree (5 levels)', () => {
    return () => {
      tsyringeContainer.resolve(TSyringeRootService);
    };
  }),

  benny.add('ts-ioc-container - resolve deep tree (5 levels)', () => {
    return () => {
      tsiocContainer.resolve('RootService');
    };
  }),

  benny.cycle(),
  benny.complete(),
  benny.save({ file: 'deep-tree', version: '1.0.0' }),
  benny.save({ file: 'deep-tree', format: 'chart.html' }),
);
