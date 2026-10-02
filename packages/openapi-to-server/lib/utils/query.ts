export type Params = Record<string, string | number | boolean>;
export type Query = Record<string, string | number | boolean>;
export type Body = Record<string, string | number | Date | boolean | object>;
export type Payload = {
  query?: Query;
  params?: Params;
  body?: Body;
};

const isPresent = ([, value]: [string, unknown]) => value !== null && value !== undefined;

export function addPathParams(url: string, params: Params): string {
  return Object.entries(params)
    .filter(isPresent)
    .reduce((acc, [key, value]) => acc.replace(`{${key}}`, encodeURIComponent(value)), url);
}

export function addQueryParams(url: string, query: Query): string {
  const queryStr = Object.entries(query)
    .filter(isPresent)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return queryStr ? `${url}?${queryStr}` : url;
}

export const createUrl = (pattern: string, { params = {}, query = {} }: Partial<Payload>): string => {
  return addQueryParams(addPathParams(pattern, params ?? {}), query ?? {});
};
