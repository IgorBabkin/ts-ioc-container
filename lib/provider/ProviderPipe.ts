import type { IRegistration } from '../registration/IRegistration';
import type { IProvider } from './IProvider';

export interface ProviderPipe<T = unknown> {
  mapProvider(p: IProvider<T>): IProvider<T>;

  mapRegistration(r: IRegistration<T>): IRegistration<T>;
}

export const isProviderPipe = <T>(obj: unknown): obj is ProviderPipe<T> =>
  obj !== null && typeof obj === 'object' && 'mapProvider' in obj;

export const registerPipe = <T>(mapProvider: (p: IProvider<T>) => IProvider<T>): ProviderPipe<T> => ({
  mapProvider,
  mapRegistration: (r) => r.pipe(mapProvider),
});
