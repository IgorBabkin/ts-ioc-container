import { DependencyKey, IContainerModule } from '../container/IContainer';

export interface IRegistration extends IContainerModule {
  getKey(): DependencyKey;
}
