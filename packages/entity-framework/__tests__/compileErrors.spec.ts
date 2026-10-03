import 'reflect-metadata';
import { SingleToken } from 'ts-ioc-container';

import { Entity, EntityManager, entityManagerToken, type IRepository } from '../lib';

/**
 * Likely agent mistakes that must fail at compile time. `pnpm run type-check`
 * covers this file: an `@ts-expect-error` that stops erroring fails the check.
 */
type PostDto = { id: string; title: string; commentId: string | null; tagIds: string[]; views: number };
type CommentDto = { id: string; text: string };
type CounterDto = { id: number; value: number };

declare const posts: EntityManager<IRepository<PostDto>>;
declare const comments: EntityManager<IRepository<CommentDto, Entity<CommentDto>, Omit<CommentDto, 'id'>>>;
declare const counters: EntityManager<IRepository<CounterDto, Entity<CounterDto>, Omit<CounterDto, 'id'>>>;

describe('compile-time mistakes', () => {
  it('are rejected by the type checker (see type-check)', () => {
    expect(true).toBe(true);
  });
});

export async function mistakes(post: Entity<PostDto>): Promise<void> {
  post.link('commentId', comments.lazy({ text: 'ok' }));
  post.link('tagIds', ['t-0', comments.lazy({ text: 'ok' })]);

  // @ts-expect-error a field typed for a string id cannot hold a numeric id
  post.link('commentId', counters.lazy({ value: 1 }));
  // @ts-expect-error a field that holds no id at all
  post.link('views', comments.lazy({ text: 'x' }));
  // @ts-expect-error a field the DTO does not have
  post.link('authorId', comments.lazy({ text: 'x' }));
  // @ts-expect-error lazy takes the repository's Value: the id is minted by the database
  comments.lazy({ id: 'c-1', text: 'x' });
  // @ts-expect-error create needs the whole record
  posts.create({ id: 'p-1', title: 'missing fields' });
  // @ts-expect-error patch takes the DTO's own fields
  post.patch({ titel: 'typo' });
  // @ts-expect-error entityManagerToken takes a repository token, not any token
  entityManagerToken(new SingleToken<{ name: string }>('INotARepository'));
  // @ts-expect-error findById takes the id type of the repository
  await counters.findById('1');
}
