import { z } from 'zod';

const zNumber = z.string().regex(/^\d+$/).transform(Number);

const zDate = z.preprocess((arg) => {
  if (typeof arg === 'string' || typeof arg === 'number') {
    return new Date(arg);
  }

  return arg;
}, z.date());

export const Item = z.object({
  id: z.string(),
  name: z.string(),
});

export const PAYLOADS = {
  createItem: z.object({
    body: Item,
  }),
  getItems: z.object({
    query: z.object({
      limit: zNumber,
    }),
  }),
  deleteItem: z.object({
    params: z.object({
      id: z.string(),
    }),
  }),
  getItem: z.object({
    params: z.object({
      id: z.string(),
    }),
  }),
};
