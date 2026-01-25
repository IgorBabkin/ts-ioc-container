import { container, inject, injectable } from 'tsyringe';

// TSyringe setup - Deep dependency tree
@injectable()
class TSyringeLeafService {
  getName() {
    return 'leaf';
  }
}

@injectable()
class TSyringeLevel3Service {
  constructor(@inject('TSyringeLeafService') private leaf: TSyringeLeafService) {}

  getData() {
    return this.leaf.getName();
  }
}

@injectable()
class TSyringeLevel2Service {
  constructor(@inject('TSyringeLevel3Service') private level3: TSyringeLevel3Service) {}

  getData() {
    return this.level3.getData();
  }
}

@injectable()
class TSyringeLevel1Service {
  constructor(@inject('TSyringeLevel2Service') private level2: TSyringeLevel2Service) {}

  getData() {
    return this.level2.getData();
  }
}

@injectable()
export class TSyringeRootService {
  constructor(@inject('TSyringeLevel1Service') private level1: TSyringeLevel1Service) {}

  getData() {
    return this.level1.getData();
  }
}

container
  .register('TSyringeLeafService', { useClass: TSyringeLeafService })
  .register('TSyringeLevel1Service', { useClass: TSyringeLevel1Service })
  .register('TSyringeLevel2Service', { useClass: TSyringeLevel2Service })
  .register('TSyringeLevel3Service', { useClass: TSyringeLevel3Service });

export default () => {
  return () => {
    container.resolve(TSyringeRootService);
  };
};
