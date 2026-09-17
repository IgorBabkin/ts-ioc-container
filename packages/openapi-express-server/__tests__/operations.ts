import { UseCase, HttpResponse, HttpStatus, constructor } from '@ibabkin/openapi-to-server';

// Components
export type Item = {
  id: string;
  name: string;
};

// Use cases
export type CreateItemPayload = {
  body: Item;
};

export interface CreateItemResponse extends HttpResponse {
  status: HttpStatus.Created;

  headers: {};
}

/**
 * @tags items
 */
export interface CreateItemUseCase extends UseCase<CreateItemPayload, CreateItemResponse> {}

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

/**
 * @tags items
 */
export interface GetItemsUseCase extends UseCase<GetItemsPayload, GetItemsResponse> {}

export type DeleteItemPayload = {
  params: {
    id: string;
  };
};

export interface DeleteItemResponse extends HttpResponse {
  status: HttpStatus.NoContent;

  headers: {};
}

/**
 * @tags items
 */
export interface DeleteItemUseCase extends UseCase<DeleteItemPayload, DeleteItemResponse> {}

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

/**
 * @tags items
 */
export interface GetItemUseCase extends UseCase<GetItemPayload, GetItemResponse> {}

// Operations
export type Operations = {
  createItem: CreateItemUseCase;
  getItems: GetItemsUseCase;
  deleteItem: DeleteItemUseCase;
  getItem: GetItemUseCase;
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

// Server Interface
export interface IServer {
  createItem: constructor<CreateItemUseCase>;
  getItems: constructor<GetItemsUseCase>;
  deleteItem: constructor<DeleteItemUseCase>;
  getItem: constructor<GetItemUseCase>;
}
