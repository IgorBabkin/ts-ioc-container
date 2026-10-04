import 'reflect-metadata';
import { SingleToken } from 'ts-ioc-container';

import { Entity, EntityManager, type IRepository, managerOf, type UnitOfWork } from '../lib';

/**
 * Likely agent mistakes that must fail at compile time. `pnpm run type-check`
 * covers this file: an `@ts-expect-error` that stops erroring fails the check.
 */
type PostDto = { id: string; title: string; commentId: string | null; tagIds: string[]; views: number };
type CommentDto = { id: string; text: string };
type CounterDto = { id: number; value: number };
type TariffDto = { id: string; tenant: string; price: number };
type TariffKey = { id: string; tenant: string };

declare const posts: EntityManager<IRepository<PostDto>>;
declare const counters: EntityManager<IRepository<CounterDto>>;
type TariffRepository = IRepository<TariffDto, Entity<TariffDto>, TariffKey> & {
  keyOf(tariff: TariffDto): TariffKey;
};
declare const tariffs: EntityManager<TariffRepository>;
declare const uow: UnitOfWork;
declare class DraftRepository implements IRepository<PostDto> {
  readonly entityName: string;
  declare readonly prepare: (draft: { title: string }) => Promise<PostDto>;
  findById(id: string): Promise<PostDto | undefined>;
  create(post: PostDto): Promise<PostDto>;
  update(stored: PostDto, diff: Partial<PostDto>): Promise<PostDto>;
  delete(stored: PostDto): Promise<void>;
}
declare const drafts: EntityManager<DraftRepository>;

describe('compile-time mistakes', () => {
  it('are rejected by the type checker (see type-check)', () => {
    expect(true).toBe(true);
  });
});

export async function mistakes(post: Entity<PostDto>): Promise<void> {
  // @ts-expect-error create needs the whole record
  posts.create({ id: 'p-1', title: 'missing fields' });
  // @ts-expect-error patch takes the DTO's own fields
  post.patch({ titel: 'typo' });
  // @ts-expect-error findById takes the id type of the repository
  await counters.findById('1');

  await posts.add({ title: 'ok', commentId: null, tagIds: [], views: 0 });
  // @ts-expect-error add takes the record without its id: the repository reserves it
  await posts.add({ id: 'p-1', title: 'x', commentId: null, tagIds: [], views: 0 });
  await drafts.add({ title: 'only what prepare takes' });
  // @ts-expect-error a declared prepare says what add takes
  await drafts.add({ title: 'x', commentId: null, tagIds: [], views: 0, extra: true });

  await tariffs.findById({ id: 't-1', tenant: 'acme' });
  await tariffs.findByIds([{ id: 't-1', tenant: 'acme' }]);
  // @ts-expect-error a repository keyed by more than the id is read by its whole key
  await tariffs.findById('t-1');
  // @ts-expect-error the key names every field of it
  await tariffs.findById({ id: 't-1' });

  uow.of(new SingleToken<IRepository<CommentDto>>('IComments'));
  // @ts-expect-error a unit of work answers managers of repositories only
  uow.of(new SingleToken<{ name: string }>('INotARepository'));
  // @ts-expect-error managerOf takes a repository token
  managerOf(new SingleToken<{ name: string }>('INotARepository'));
}

const missingKeyOf: IRepository<TariffDto, Entity<TariffDto>, TariffKey> = {
  entityName: 'Tariff',
  findById: async () => undefined,
  create: async (tariff) => tariff,
  update: async (stored) => stored,
  delete: async () => undefined,
};
// @ts-expect-error a repository keyed by more than the id must say how to key a record (keyOf)
export const unkeyed = new EntityManager(missingKeyOf);
// @ts-expect-error the same, through a unit of work
export const unkeyedOf = (unit: UnitOfWork) => unit.of(new SingleToken<typeof missingKeyOf>('ITariffs'));
export const keyed = (unit: UnitOfWork) => unit.of(new SingleToken<TariffRepository>('ITariffs'));

export const references: IRepository<PostDto> = {
  entityName: 'Post',
  // @ts-expect-error references name the record's own fields
  references: { authorId: new SingleToken<IRepository<CommentDto>>('IComments') },
  findById: async () => undefined,
  create: async (post) => post,
  update: async (stored) => stored,
  delete: async () => undefined,
};
