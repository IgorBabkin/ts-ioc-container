import { Route, HttpResponse, HttpStatus } from '@ibabkin/openapi-to-server';

// Components
export type Item = {
  id: string;
  name: string;
};

// Routes
export type CreateItemPayload = {
  body: Item;
};

export interface CreateItemResponse extends HttpResponse {
  status: HttpStatus.Created;

  headers: {};
}

export interface CreateItemRoute extends Route<CreateItemPayload, CreateItemResponse> {}

export type GetItemsPayload = {
  query: {
    limit?: number;
  };
};

export interface GetItemsResponse extends HttpResponse {
  status: HttpStatus.OK;

  headers: {};

  body: Item[];
}

export interface GetItemsRoute extends Route<GetItemsPayload, GetItemsResponse> {}

export type DeleteItemPayload = {
  params: {
    id: string;
  };
};

export interface DeleteItemResponse extends HttpResponse {
  status: HttpStatus.NoContent;

  headers: {};
}

export interface DeleteItemRoute extends Route<DeleteItemPayload, DeleteItemResponse> {}

export type GetItemPayload = {
  params: {
    id: string;
  };
};

export interface GetItemResponse extends HttpResponse {
  status: HttpStatus.OK;

  headers: {};

  body: Item;
}

export interface GetItemRoute extends Route<GetItemPayload, GetItemResponse> {}

// Operations
export type Operations = {
  createItem: CreateItemRoute;
  getItems: GetItemsRoute;
  deleteItem: DeleteItemRoute;
  getItem: GetItemRoute;
};

export type RoutesPayloads = {
  createItem: CreateItemPayload;
  getItems: GetItemsPayload;
  deleteItem: DeleteItemPayload;
  getItem: GetItemPayload;
};

// Context
export interface RequestContext {
  getUrl<Key extends keyof RoutesPayloads>(key: Key, payload: RoutesPayloads[Key]): string;
}

// Controller Interfaces
/**
 * Controller interface for Items operations
 * Each method corresponds to an OpenAPI operation defined in swagger.yaml
 */
export interface IItemsController {
  /**
   *
   * @param payload - Request payload including path params, query params, and body
   * @returns Promise with the operation response
   */
  getItems(payload: GetItemsPayload): Promise<GetItemsResponse>;

  /**
   *
   * @param payload - Request payload including path params, query params, and body
   * @returns Promise with the operation response
   */
  createItem(payload: CreateItemPayload): Promise<CreateItemResponse>;

  /**
   *
   * @param payload - Request payload including path params, query params, and body
   * @returns Promise with the operation response
   */
  getItem(payload: GetItemPayload): Promise<GetItemResponse>;

  /**
   *
   * @param payload - Request payload including path params, query params, and body
   * @returns Promise with the operation response
   */
  deleteItem(payload: DeleteItemPayload): Promise<DeleteItemResponse>;
}

// Server Interface
export interface IServer {
  Items: constructor<IItemsController>;
}
