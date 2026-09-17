import { renderComponents, renderServer } from '../lib';
import { loadYAML } from './yaml';
import fs from 'fs';
import * as path from 'path';
import { OpenAPIV3 } from 'openapi-types';

const inputFile = path.resolve(__dirname, './swagger.yaml');
const outputDir = path.resolve(__dirname, '../.generated');

describe('openapi-to-server-interface', () => {
  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  describe('renderComponents', () => {
    it('should generate component types from OpenAPI spec', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const components = renderComponents(doc);

      const outputFile = path.resolve(outputDir, 'components.ts');
      fs.writeFileSync(outputFile, components);

      expect(fs.existsSync(outputFile)).toBe(true);
      expect(components).toContain('export type Item');
      expect(components).toContain('import { UseCase, HttpResponse, HttpStatus, constructor }');
      expect(components).toMatchSnapshot();
    });

    it('should contain Operations type', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const components = renderComponents(doc);

      expect(components).toContain('export type Operations = {');
      expect(components).toContain('getItems:');
      expect(components).toContain('createItem:');
      expect(components).toContain('getItem:');
      expect(components).toContain('deleteItem:');
    });

    it('should contain RoutesPayloads type', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const components = renderComponents(doc);

      expect(components).toContain('export type RoutesPayloads = {');
      expect(components).toContain('getItems:');
      expect(components).toContain('createItem:');
    });

    it('should contain RequestContext interface', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const components = renderComponents(doc);

      expect(components).toContain('export interface RequestContext');
      expect(components).toContain('getUrl<Key extends keyof RoutesPayloads>');
    });

    it('should contain a use case interface for each operation', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const components = renderComponents(doc);

      expect(components).toContain(
        'export interface GetItemsUseCase extends UseCase<GetItemsPayload, GetItemsResponse>',
      );
      expect(components).toContain(
        'export interface CreateItemUseCase extends UseCase<CreateItemPayload, CreateItemResponse>',
      );
      expect(components).toContain('export interface GetItemUseCase extends UseCase<GetItemPayload, GetItemResponse>');
      expect(components).toContain(
        'export interface DeleteItemUseCase extends UseCase<DeleteItemPayload, DeleteItemResponse>',
      );
    });
  });

  describe('renderServer', () => {
    it('should generate IServer interface from OpenAPI spec', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const server = renderServer(doc);

      const outputFile = path.resolve(outputDir, 'server.ts');
      fs.writeFileSync(outputFile, server);

      expect(fs.existsSync(outputFile)).toBe(true);
      expect(server).toContain('export interface IServer');
      expect(server).toMatchSnapshot();
    });

    it('should contain a constructor type for each operation', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const server = renderServer(doc);

      expect(server).toContain('getItems: constructor<GetItemsUseCase>');
      expect(server).toContain('createItem: constructor<CreateItemUseCase>');
      expect(server).toContain('getItem: constructor<GetItemUseCase>');
      expect(server).toContain('deleteItem: constructor<DeleteItemUseCase>');
    });

    it('should use constructor type helper', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const server = renderServer(doc);

      expect(server).toContain('constructor<');
    });
  });

  describe('integration', () => {
    it('should generate both outputs together', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const components = renderComponents(doc);
      const server = renderServer(doc);

      const output = components + '\n\n' + server;
      const outputFile = path.resolve(outputDir, 'server-interfaces.ts');
      fs.writeFileSync(outputFile, output);

      expect(fs.existsSync(outputFile)).toBe(true);
      expect(output).toContain('export type Item');
      expect(output).toContain('export interface GetItemsUseCase');
      expect(output).toContain('export interface IServer');
    });
  });
});
