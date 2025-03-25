import { IRegistration } from '../registration/IRegistration';
import { IProvider } from './IProvider';

export interface ProviderPipe<T = unknown> {
  mapProvider(p: IProvider<T>): IProvider<T>;

  mapRegistration(r: IRegistration<T>): IRegistration<T>;
}

export const isProviderPipe = <T>(obj: unknown): obj is ProviderPipe<T> =>
  obj !== null && typeof obj === 'object' && 'mapProvider' in obj;

export abstract class RegistrationPipe<T> implements ProviderPipe<T> {
  abstract mapProvider(p: IProvider<T>): IProvider<T>;

  mapRegistration(r: IRegistration<T>): IRegistration<T> {
    return r.pipe(this.mapProvider.bind(this));
  }
}
