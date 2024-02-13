export interface RouteOptions {
  tags: string[];
}

export interface Route<Payload, Response> {
  handle(payload: Payload, options: RouteOptions): Promise<Response>;
}

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
