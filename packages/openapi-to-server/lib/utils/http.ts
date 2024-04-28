export interface RouteOptions {
  tags: string[];
}

export interface HttpHeaders {
  Location: string;
}

export interface HttpResponse {
  status: number;
  headers: Partial<HttpHeaders>;
}

export interface Route<Payload, Response extends HttpResponse> {
  handle(payload: Payload, options: RouteOptions): Promise<Response>;
}
