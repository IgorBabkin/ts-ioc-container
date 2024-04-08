import { getProp, prop } from './metadata';

export const setTags = (...tags: string[]) => prop('tags', tags);
export const getTags = (target: object): string[] => getProp<string[]>(target.constructor, 'tags') ?? [];
