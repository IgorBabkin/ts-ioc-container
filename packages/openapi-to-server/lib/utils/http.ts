export interface RouteOptions {
  tags: string[];
}

export interface HttpResponse<Payload = unknown> {
  status: number;
  location?: string;
  payload?: Payload;
}

export interface Ok<Payload> extends HttpResponse<Payload> {
  status: 200;
}

export interface Created extends HttpResponse {
  status: 201;
}

export interface NoContent extends HttpResponse {
  status: 204;
}

export interface Route<Payload, Response extends HttpResponse> {
  handle(payload: Payload, options: RouteOptions): Promise<Response>;
}
