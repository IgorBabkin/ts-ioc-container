export type constructor<T> = new (...args: any[]) => T;

export interface RouteOptions {
  tags: string[];
}

export interface HttpHeaders {
  Location: string;
}

export enum HttpStatus {
  OK = 200,
  Created = 201,
  NoContent = 204,
  Found = 302,
}

export interface HttpResponse {
  status: HttpStatus;
  headers: Partial<HttpHeaders>;
  body?: unknown;
}

/**
 * One operation of the OpenAPI document: receives its validated payload and returns its response.
 * The generated `<Op>UseCase` interfaces bind `Payload` and `Response` to the operation's types.
 */
export interface UseCase<Payload, Response extends HttpResponse> {
  handle(payload: Payload, context: any): Promise<Response>;
}
