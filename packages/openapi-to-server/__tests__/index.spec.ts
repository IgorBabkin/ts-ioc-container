import { renderComponents, renderControllers, renderServer } from '../lib';
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
      expect(components).toContain('import { Route, HttpResponse, HttpStatus }');
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
  });

  describe('renderControllers', () => {
    it('should generate controller interfaces from OpenAPI spec', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const controllers = renderControllers(doc);

      const outputFile = path.resolve(outputDir, 'controllers.ts');
      fs.writeFileSync(outputFile, controllers);

      expect(fs.existsSync(outputFile)).toBe(true);
      expect(controllers).toContain('export interface IItemsController');
      expect(controllers).toMatchSnapshot();
    });

    it('should contain controller methods for each operation', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const controllers = renderControllers(doc);

      expect(controllers).toContain('getItems(payload: GetItemsPayload): Promise<GetItemsResponse>');
      expect(controllers).toContain('createItem(payload: CreateItemPayload): Promise<CreateItemResponse>');
      expect(controllers).toContain('getItem(payload: GetItemPayload): Promise<GetItemResponse>');
      expect(controllers).toContain('deleteItem(payload: DeleteItemPayload): Promise<DeleteItemResponse>');
    });

    it('should group operations by tags', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const controllers = renderControllers(doc);

      expect(controllers).toContain('Controller interface for items operations');
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

    it('should contain constructor types for each tag', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const server = renderServer(doc);

      expect(server).toContain('items: constructor<IItemsController>');
    });

    it('should use constructor type helper', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const server = renderServer(doc);

      expect(server).toContain('constructor<');
    });
  });

  describe('integration', () => {
    it('should generate all three outputs together', () => {
      const doc = loadYAML<OpenAPIV3.Document>(inputFile);
      const components = renderComponents(doc);
      const controllers = renderControllers(doc);
      const server = renderServer(doc);

      const output = components + '\n\n' + controllers + '\n\n' + server;
      const outputFile = path.resolve(outputDir, 'server-interfaces.ts');
      fs.writeFileSync(outputFile, output);

      expect(fs.existsSync(outputFile)).toBe(true);
      expect(output).toContain('export type Item');
      expect(output).toContain('export interface IItemsController');
      expect(output).toContain('export interface IServer');
    });
  });
});
