import 'reflect-metadata';
import request from 'supertest';
import express, { type Express } from 'express';
import * as path from 'path';
import { Container, IContainer, Registration } from 'ts-ioc-container';
import { z } from 'zod';
import * as YAML from 'yaml';
import * as fs from 'fs';
import { RouteBuilder } from './RouteBuilder';

enum HttpStatus {
  OK = 200,
  Created = 201,
  NoContent = 204,
}

// One use case per operation, each registered under its operationId.
class GetItemsUseCase {
  async handle() {
    return {
      status: HttpStatus.OK,
      headers: {},
      body: [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ],
    };
  }
}

class CreateItemUseCase {
  async handle(payload: any) {
    return {
      status: HttpStatus.Created,
      headers: {
        Location: '/items/123',
      },
      body: { id: '123', name: payload.body.name },
    };
  }
}

/** Echoes the tags of the request scope it was resolved from, so the test can see them. */
class GetItemUseCase {
  async handle(payload: any, scope: IContainer) {
    const scopeTags = ['request', 'items', 'application', 'unrelated'].filter((tag) => scope.hasTag(tag));

    return {
      status: HttpStatus.OK,
      headers: {},
      body: { id: payload.params.id, name: 'Test Item', scopeTags },
    };
  }
}

class DeleteItemUseCase {
  async handle() {
    return {
      status: HttpStatus.NoContent,
      headers: {},
    };
  }
}

const SWAGGER_PATH = path.resolve(__dirname, './swagger.yaml');
const VALIDATORS = {
  getItems: z.object({
    query: z.object({ limit: z.string().optional() }).optional(),
  }),
  createItem: z.object({
    body: z.object({ name: z.string() }),
  }),
  getItem: z.object({
    params: z.object({ id: z.string() }),
  }),
  deleteItem: z.object({
    params: z.object({ id: z.string() }),
  }),
};

describe('ExpressOpenAPIServer', () => {
  let app: Express;

  beforeAll(() => {
    const container = new Container({ tags: ['application'] });

    // UC-4 — use cases are registered under the operationId verbatim.
    container.addRegistration(Registration.fromClass(GetItemsUseCase).bindToKey('getItems'));
    container.addRegistration(Registration.fromClass(CreateItemUseCase).bindToKey('createItem'));
    container.addRegistration(Registration.fromClass(GetItemUseCase).bindToKey('getItem'));
    container.addRegistration(Registration.fromClass(DeleteItemUseCase).bindToKey('deleteItem'));

    const spec = YAML.parse(fs.readFileSync(SWAGGER_PATH, 'utf8'));
    const routeBuilder = container.resolve(RouteBuilder, { args: [spec, VALIDATORS] });

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    routeBuilder.applyTo(app);
  });

  describe('GET /items', () => {
    it('should return list of items', async () => {
      const response = await request(app).get('/items').expect(200);

      expect(response.body).toEqual([
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ]);
    });

    it('should accept query parameters', async () => {
      const response = await request(app).get('/items?limit=10').expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('POST /items', () => {
    it('should create a new item', async () => {
      const response = await request(app).post('/items').send({ name: 'New Item' }).expect(201);

      expect(response.body).toEqual({
        id: '123',
        name: 'New Item',
      });
      expect(response.headers.location).toBe('/items/123');
    });
  });

  describe('GET /items/:id', () => {
    it('should return a specific item', async () => {
      const response = await request(app).get('/items/123').expect(200);

      expect(response.body).toEqual({
        id: '123',
        name: 'Test Item',
        scopeTags: ['request', 'items'],
      });
    });

    // SPEC-007 UC-6 — the request scope carries `request` and the operation's tags, so a
    // registration bound to a tag applies to exactly the operations carrying it.
    it('resolves the use case from a request scope tagged with the operation tags', async () => {
      const response = await request(app).get('/items/123').expect(200);

      expect(response.body.scopeTags).toEqual(['request', 'items']);
    });
  });

  describe('DELETE /items/:id', () => {
    it('should delete an item', async () => {
      await request(app).delete('/items/123').expect(204);
    });
  });
});
