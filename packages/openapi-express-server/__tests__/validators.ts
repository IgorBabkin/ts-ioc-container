import { z } from 'zod';

// Path and query parameters arrive as strings while JSON bodies carry real numbers: accept both.
const zNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)) ? Number(value) : value,
    schema,
  );

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
      limit: zNumber(z.number().int()).optional(),
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
