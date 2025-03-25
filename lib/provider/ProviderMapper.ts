import { IRegistration } from '../registration/IRegistration';
import { IProvider } from './IProvider';

export interface ProviderMapper<T = unknown> {
  mapProvider(p: IProvider<T>): IProvider<T>;

  mapRegistration(r: IRegistration<T>): IRegistration<T>;
}

export const isProviderMapper = <T>(obj: unknown): obj is ProviderMapper<T> =>
  obj !== null && typeof obj === 'object' && 'mapProvider' in obj;

export abstract class RegistrationMapper<T> implements ProviderMapper<T> {
  abstract mapProvider(p: IProvider<T>): IProvider<T>;

  mapRegistration(r: IRegistration<T>): IRegistration<T> {
    return r.pipe(this.mapProvider.bind(this));
  }
}
