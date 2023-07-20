import { IProvider } from './IProvider';
import { ProviderDecorator } from './ProviderDecorator';
import { Tag, Tagged } from '../container/IContainer';
import { MapFn } from '../utils';

export function tags<T = unknown>(...values: Tag[]): MapFn<IProvider<T>> {
  return (provider) => new TaggedProvider(provider, values);
}

export class TaggedProvider<T> extends ProviderDecorator<T> {
  constructor(private provider: IProvider<T>, private readonly tags: Tag[]) {
    super(provider);
  }

  clone(): TaggedProvider<T> {
    return new TaggedProvider(this.provider.clone(), this.tags);
  }

  isValid(filters: Tagged): boolean {
    return this.tags.some((t) => filters.hasTag(t)) && this.provider.isValid(filters);
  }
}
