import { renderClient } from '../lib';
import { loadYAML } from './yaml';
import * as path from 'path';
import { OpenAPIV3 } from 'openapi-types';

const inputFile = path.resolve(__dirname, './swagger.yaml');

describe('renderClient', () => {
  let client: string;

  beforeAll(() => {
    client = renderClient(loadYAML<OpenAPIV3.Document>(inputFile));
  });

  it('should generate an axios based ApiClient', () => {
    expect(client).toContain("import { createUrl } from '@ibabkin/openapi-to-server';");
    expect(client).toContain('export class ApiClient');
    expect(client).toMatchSnapshot();
  });

  it('should expose one method per operation', () => {
    expect(client).toContain('async getItems(data: GetItemsPayload): Promise<GetItemsResponse>');
    expect(client).toContain('async createItem(data: CreateItemPayload): Promise<CreateItemResponse>');
    expect(client).toContain('async getItem(data: GetItemPayload): Promise<GetItemResponse>');
    expect(client).toContain('async deleteItem(data: DeleteItemPayload): Promise<DeleteItemResponse>');
  });

  it('should send the body only for operations with a request body', () => {
    const createItem = client.slice(client.indexOf('async createItem'), client.indexOf('async getItem('));
    const getItems = client.slice(client.indexOf('async getItems'), client.indexOf('async createItem'));

    expect(createItem).toContain('data: data.body');
    expect(getItems).not.toContain('data: data.body');
  });

  it('should derive response types from the success response schema', () => {
    expect(client).toContain('export type GetItemsResponse =');
    expect(client).toContain('export type GetItemResponse = Item;');
    expect(client).toContain('export type DeleteItemResponse = void;');
  });
});
