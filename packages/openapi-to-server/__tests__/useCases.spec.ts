import { openapiToClient, openapiToServer } from '../lib';
import fs from 'fs';
import * as path from 'path';

const inputFile = path.resolve(__dirname, './swagger.yaml');
const outputDir = path.resolve(__dirname, '../.generated/use-cases');

describe('use cases', () => {
  beforeAll(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  describe('openapiToServer', () => {
    it('should write components and server into a single file', () => {
      const outputFile = path.join(outputDir, 'server', 'operations.ts');

      openapiToServer({ inputFile, outputFile });

      const output = fs.readFileSync(outputFile, 'utf8');
      expect(output).toContain('export type Item');
      expect(output).toContain('export interface GetItemsUseCase');
      expect(output).toContain('export interface IServer');
      expect(fs.existsSync(path.join(outputDir, 'server', 'swagger.json'))).toBe(false);
    });

    it('should emit the parsed document as JSON next to the output when asked', () => {
      const outputFile = path.join(outputDir, 'server-json', 'operations.ts');

      openapiToServer({ inputFile, outputFile, emitJSON: true });

      const jsonFile = path.join(outputDir, 'server-json', 'swagger.json');
      expect(fs.existsSync(jsonFile)).toBe(true);
      expect(JSON.parse(fs.readFileSync(jsonFile, 'utf8'))).toMatchObject({ openapi: expect.any(String) });
    });
  });

  describe('openapiToClient', () => {
    it('should write the client into the output file', () => {
      const outputFile = path.join(outputDir, 'client', 'client.ts');

      openapiToClient({ inputFile, outputFile });

      expect(fs.readFileSync(outputFile, 'utf8')).toContain('export class ApiClient');
    });
  });
});
