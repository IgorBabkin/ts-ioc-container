import { IDisposable } from '../core/IDisposable';

export interface ISaga extends IDisposable {
  initialize(): void;
}
