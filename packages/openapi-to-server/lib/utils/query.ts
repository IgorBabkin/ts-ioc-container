export type Params = Record<string, string | number | boolean>;
export type Query = Record<string, string | number | boolean>;
export type Body = Record<string, string | number | Date | boolean | object>;
export type Payload = {
  query?: Query;
  params?: Params;
  body?: Body;
};

const isPresent = ([key]: [string, unknown]) => key !== null && key !== undefined;

export function addPathParams(url: string, params: Params): string {
  return Object.entries(params)
    .filter(isPresent)
    .reduce((acc, [key, value]) => acc.replace(`{${key}}`, encodeURIComponent(value)), url);
}

export function addQueryParams(url: string, query: Query): string {
  const queryStr = Object.entries(query)
    .filter(isPresent)
    .reduce((acc, [key, value]) => acc.concat([key, encodeURIComponent(value)]), [] as [string, string][])
    .join('&');
  return queryStr ? `${url}?${queryStr}` : `${url}`;
}
