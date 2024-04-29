export interface RouteOptions {
  tags: string[];
}

export interface HttpHeaders {
  Location: string;
}

export interface HttpResponse {
  status: number;
  headers: Partial<HttpHeaders>;
  body?: unknown;
}

export interface Route<Payload, Response extends HttpResponse> {
  handle(payload: Payload, options: RouteOptions): Promise<Response>;
}
