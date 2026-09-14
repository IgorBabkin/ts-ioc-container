import { DependencyKey, IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { ArgsFn, ProviderOptions } from '../provider/IProvider';
import { joinNamespace, type Namespace } from '../utils/namespace';

export class SingleToken<T = any> extends InjectionToken<T> {
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;
  private readonly _dirname?: string;
  private readonly _namespace?: Namespace;

  constructor(
    public token: DependencyKey,
    {
      getArgsFn = () => [],
      isLazy = false,
      namespace,
    }: { getArgsFn?: ArgsFn; isLazy?: boolean; namespace?: string } = {},
  ) {
    super();
    this._getArgsFn = getArgsFn;
    this._isLazy = isLazy;
    // The module path is kept as given so a derived token composes its own name from the same input.
    this._dirname = namespace;
    this._namespace = namespace === undefined ? undefined : joinNamespace(namespace, token);
  }

  /**
   * The namespace name this token resolves from - the module path it was given
   * plus its key - or `undefined` when it was given no module path.
   */
  getNamespace(): Namespace | undefined {
    return this._namespace;
  }

  /**
   * Points the token at the module resolving it, so providers restricted by a
   * namespace template can tell where the request comes from.
   *
   * Like every other token method it returns a new token; the parent is untouched.
   */
  namespace(dirname: string) {
    return new SingleToken<T>(this.token, {
      getArgsFn: this._getArgsFn,
      isLazy: this._isLazy,
      namespace: dirname,
    });
  }

  select<R>(fn: (target: T) => R) {
    return (s: IContainer) => fn(this.resolve(s));
  }

  resolve(s: IContainer, { args = [], lazy, namespace }: ProviderOptions = {}): T {
    return s.resolve(this.token, {
      args: this._getArgsFn(s, { args }),
      lazy: this._isLazy || lazy,
      // The token's own module path wins; a caller's namespace only fills the gap when it has none.
      namespace: this._namespace ?? namespace,
    });
  }

  bindTo(r: IRegistration<T>) {
    r.bindToKey(this.token);
  }

  args(...newArgs: unknown[]) {
    const parentFn = this._getArgsFn;
    return new SingleToken<T>(this.token, {
      getArgsFn: (s, opts) => [...parentFn(s, opts), ...newArgs],
      isLazy: this._isLazy,
      namespace: this._dirname,
    });
  }

  argsFn(fn: (s: IContainer) => unknown[]) {
    const parentFn = this._getArgsFn;
    return new SingleToken<T>(this.token, {
      getArgsFn: (s, opts) => [...parentFn(s, opts), ...fn(s)],
      isLazy: this._isLazy,
      namespace: this._dirname,
    });
  }

  lazy() {
    return new SingleToken<T>(this.token, {
      getArgsFn: this._getArgsFn,
      isLazy: true,
      namespace: this._dirname,
    });
  }
}
