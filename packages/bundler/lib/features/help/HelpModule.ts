import { type IContainer, type IContainerModule, Registration as R } from 'ts-ioc-container';
import { HelpController } from './HelpController';
import { VersionController } from './VersionController';

export class HelpModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(HelpController)).addRegistration(R.fromClass(VersionController));
  }
}
