import { type IContainer, type IContainerModule, Registration as R } from 'ts-ioc-container';
import { BundleController } from './BundleController';
import { BundleService } from './services/BundleService';
import { BundleView } from './services/BundleView';
import { TicConfigService } from './services/TicConfigService';

export class BuildModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container
      .addRegistration(R.fromClass(BundleController))
      .addRegistration(R.fromClass(BundleService))
      .addRegistration(R.fromClass(BundleView))
      .addRegistration(R.fromClass(TicConfigService));
  }
}
