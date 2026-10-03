import { type IContainer, type IContainerModule, Registration as R } from 'ts-ioc-container';
import { BuildController } from './BuildController';
import { BundleBuilder } from './services/BundleBuilder';

export class BuildModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(BuildController)).addRegistration(R.fromClass(BundleBuilder));
  }
}
