import request from 'supertest';
import { type Express } from 'express';
import * as express from 'express';
import * as path from 'path';
import { containerMiddleware } from '../lib/containerMiddleware';
import { Container } from 'ts-ioc-container';
import { RouteBuilder } from '../lib/RouteBuilder';
import { z } from 'zod';

enum HttpStatus {
  OK = 200,
  Created = 201,
  NoContent = 204,
}

class ItemsController {
  async getItems() {
    return {
      status: HttpStatus.OK,
      headers: {},
      body: [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ],
    };
  }

  async createItem(payload: any) {
    return {
      status: HttpStatus.Created,
      headers: {
        Location: '/items/123',
      },
      body: { id: '123', name: payload.body.name },
    };
  }

  async getItem(payload: any) {
    return {
      status: HttpStatus.OK,
      headers: {},
      body: { id: payload.params.id, name: 'Test Item' },
    };
  }

  async deleteItem() {
    return {
      status: HttpStatus.NoContent,
      headers: {},
    };
  }
}

describe('ExpressOpenAPIServer', () => {
  let app: Express;

  beforeAll(() => {
    const specPath = path.resolve(__dirname, './swagger.yaml');
    const container = new Container({ tags: ['application'] });

    // Register controllers in the container
    container.register('Items', { useClass: ItemsController });

    const routeBuilder = new RouteBuilder({
      specPath,
      server: {
        Items: ItemsController,
      },
      payloadValidators: {
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
      },
    });

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(containerMiddleware(container));

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
      });
    });
  });

  describe('DELETE /items/:id', () => {
    it('should delete an item', async () => {
      await request(app).delete('/items/123').expect(204);
    });
  });
});
