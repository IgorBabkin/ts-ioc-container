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

export const Strings = z.object({
  code: z.string().min(2).max(5).regex(new RegExp('^[A-Z]+/[0-9]+$')),
  email: z.string().email().optional(),
  id: z.string().uuid().optional(),
  homepage: z.string().url().optional(),
  birthday: z.string().date().optional(),
  createdAt: zDate.optional(),
});
export const Numbers = z.object({
  count: zNumber(z.number().int().gte(0).lte(10)).optional(),
  price: zNumber(z.number().gt(0).multipleOf(0.5)).optional(),
  temperature: zNumber(z.number().lt(100)).optional(),
  level: zNumber(z.number().int().gt(0).lt(5)).optional(),
});
export const Arrays = z.object({
  tags: z
    .array(z.string())
    .min(1)
    .max(3)
    .refine((items) => new Set(items.map((item) => JSON.stringify(item))).size === items.length, {
      message: 'Items must be unique',
    })
    .optional(),
  anything: z.array(z.any()).optional(),
});
export const Objects = z.object({
  open: z
    .object({
      name: z.string().optional(),
    })
    .passthrough()
    .optional(),
  closed: z
    .object({
      name: z.string().optional(),
    })
    .strict()
    .optional(),
  dictionary: z.object({}).catchall(zNumber(z.number().int())).optional(),
  freeForm: z.object({}).passthrough().optional(),
  sized: z
    .object({
      a: z.string().optional(),
      b: z.string().optional(),
      c: z.string().optional(),
    })
    .refine((value) => Object.keys(value).length >= 1, { message: 'Must have at least 1 properties' })
    .refine((value) => Object.keys(value).length <= 2, { message: 'Must have at most 2 properties' })
    .optional(),
});
export const Cat = z.object({
  kind: z.enum(['cat']),
  meows: z.boolean(),
});
export const Dog = z.object({
  kind: z.enum(['dog']),
  barks: z.boolean(),
});
export const Named = z.object({
  name: z.string(),
});
export const Combinators = z.object({
  pet: z.union([Cat, Dog]).optional(),
  idOrCode: z.union([z.string().uuid(), zNumber(z.number().int())]).optional(),
  namedCat: Named.and(Cat).optional(),
  notAString: z
    .any()
    .refine((value) => !z.string().safeParse(value).success, { message: 'Must not match the excluded schema' })
    .optional(),
  version: z.literal(2).optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  status: z.enum(['active', 'archived']).optional(),
  nickname: z.string().nullable().optional(),
  score: zNumber(z.number()).nullable().optional(),
  nothing: z.null().optional(),
});
export const Item = z.object({
  name: z.string().min(1),
  quantity: zNumber(z.number().int().gte(1)),
});

export const PAYLOADS = {
  createItem: z.object({
    body: Item,
  }),
  searchItems: z.object({
    query: z.object({
      page: zNumber(z.number().int().gte(1)).optional(),
      limit: zNumber(z.number().int().gte(1).lte(100)).optional(),
      ratio: zNumber(z.number().gt(0).lte(1)).optional(),
    }),
  }),
};
