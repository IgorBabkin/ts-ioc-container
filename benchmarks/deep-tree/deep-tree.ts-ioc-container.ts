// ts-ioc-container setup - Deep dependency tree
import { bindTo, Container, inject, register, Registration as R } from '../../lib';

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

class RootService {
  constructor(@inject('Level1Service') private level1: Level1Service) {}

  getData() {
    return this.level1.getData();
  }
}

const container = new Container()
  .addRegistration(R.fromClass(LeafService))
  .addRegistration(R.fromClass(Level3Service))
  .addRegistration(R.fromClass(Level2Service))
  .addRegistration(R.fromClass(Level1Service));

export default () => {
  return () => {
    container.resolve(RootService);
  };
};
