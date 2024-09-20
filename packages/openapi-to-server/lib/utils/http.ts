export interface RouteOptions {
  tags: string[];
}

export interface HttpHeaders {
  Location: string;
}

export enum HttpStatus {
  OK = 200,
  NoContent = 204,
  Found = 302,
}

export interface HttpResponse {
  status: HttpStatus;
  headers: Partial<HttpHeaders>;
  body?: unknown;
}

export interface Route<Payload, Response extends HttpResponse> {
  handle(payload: Payload, context: any): Promise<Response>;
}
