export interface RouteOptions {
  tags: string[];
}

export type Route<Payload, Response> = (payload: Payload) => Promise<Response>;

export interface HttpResponse<Payload = unknown> {
  status: number;
  payload: Payload;
}

export interface Ok<Payload> extends HttpResponse<Payload> {
  status: 200;
}

export interface Created extends HttpResponse<undefined> {
  status: 201;
}
