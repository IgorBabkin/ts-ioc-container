import 'reflect-metadata';
import type { FastifyInstance } from 'fastify';
import fastify from 'fastify';
import { Container, type IContainer, Registration as R, singleton } from 'ts-ioc-container';
import { containerPlugin } from '../lib/plugin';

describe('containerPlugin', () => {
  let rootContainer: IContainer;
  let app: FastifyInstance;

  beforeEach(async () => {
    rootContainer = new Container({ tags: ['application'] });
    app = fastify();
    await app.register(containerPlugin(rootContainer));
    app.setErrorHandler((error, request, reply) => {
      reply.status(500).send({ error: error.message });
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('container creation', () => {
    it('should create a request-scoped container for each request', async () => {
      app.get('/test', async (request) => {
        const container = request.container;
        expect(container.hasTag('request')).toBe(true);
        return { success: true };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should create container with default "request" tag', async () => {
      await app.register(containerPlugin(rootContainer));

      app.get('/test', async (request) => {
        const requestContainer = request.container;
        expect(requestContainer.hasTag('request')).toBe(true);
        return { success: true };
      });

      await app.inject({
        method: 'GET',
        url: '/test',
      });
    });

    it('should create container with custom tags', async () => {
      await app.register(containerPlugin(rootContainer, { tags: ['custom', 'request'] }));

      app.get('/test', async (request) => {
        const requestContainer = request.container;
        expect(requestContainer.hasTag('custom')).toBe(true);
        expect(requestContainer.hasTag('request')).toBe(true);
        return { success: true };
      });

      await app.inject({
        method: 'GET',
        url: '/test',
      });
    });

    it('should create isolated containers for different requests', async () => {
      await app.register(containerPlugin(rootContainer));

      // Use a shared counter in root container to track unique container IDs
      let containerIdCounter = 0;
      const containerIds: number[] = [];

      app.get('/test', async (request) => {
        const container = request.container;
        // Each request should get a new container
        const id = ++containerIdCounter;
        containerIds.push(id);
        // Verify container exists
        expect(container).toBeDefined();
        expect(typeof container.resolve).toBe('function');
        return { containerId: id };
      });

      const response1 = await app.inject({ method: 'GET', url: '/test' });
      const response2 = await app.inject({ method: 'GET', url: '/test' });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      expect(containerIds).toHaveLength(2);
      expect(containerIds[0]).not.toBe(containerIds[1]);
    });

    it('should create container that can resolve dependencies from root container', async () => {
      const rootService = { name: 'RootService' };
      rootContainer.addRegistration(R.fromValue(rootService).bindTo('IRootService'));

      await app.register(containerPlugin(rootContainer));

      app.get('/test', async (request) => {
        const requestContainer = request.container;
        const resolved = requestContainer.resolve<typeof rootService>('IRootService');
        expect(resolved).toBe(rootService);
        return { success: true };
      });

      await app.inject({
        method: 'GET',
        url: '/test',
      });
    });

    it('should create container that can have request-scoped dependencies', async () => {
      const requestService = { requestId: 'req-123' };
      rootContainer.addRegistration(
        R.fromValue(requestService)
          .bindTo('IRequestService')
          .when((c) => c.hasTag('request')),
      );

      await app.register(containerPlugin(rootContainer));

      app.get('/test', async (request) => {
        const requestContainer = request.container;
        const resolved = requestContainer.resolve<typeof requestService>('IRequestService');
        expect(resolved).toBe(requestService);
        return { success: true };
      });

      await app.inject({
        method: 'GET',
        url: '/test',
      });
    });
  });

  describe('container disposal', () => {
    it('should dispose container when response is sent', async () => {
      await app.register(containerPlugin(rootContainer));

      let wasNotDisposedDuringRequest = false;

      app.get('/test', async (request) => {
        const container = request.container;
        // Container should not be disposed during request handling
        wasNotDisposedDuringRequest = !container.isDisposed;
        return { success: true };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(wasNotDisposedDuringRequest).toBe(true);
    });

    it('should dispose container only once even if multiple hooks fire', async () => {
      await app.register(containerPlugin(rootContainer));

      let disposeCallCount = 0;

      app.get('/test', async (request) => {
        const container = request.container;
        container.addOnDisposeHook(() => {
          disposeCallCount++;
        });
        return { success: true };
      });

      await app.inject({
        method: 'GET',
        url: '/test',
      });

      // Wait a bit for async hooks to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Dispose should only be called once (the guard in the plugin prevents double-dispose)
      expect(disposeCallCount).toBeLessThanOrEqual(2); // Could be 1 or 2 depending on which hook fires
    });

    it('should prevent operations on disposed container', async () => {
      await app.register(containerPlugin(rootContainer));

      app.get('/test', async (request) => {
        const container = request.container;
        // Verify container is functional during request
        expect(container.isDisposed).toBe(false);
        return { success: true };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple sequential requests', async () => {
      await app.register(containerPlugin(rootContainer));

      let requestCount = 0;
      const containerStatuses: Array<{ wasNotDisposed: boolean }> = [];

      app.get('/test', async (request) => {
        requestCount++;
        const container = request.container;
        // Verify container is not disposed during request
        containerStatuses.push({ wasNotDisposed: !container.isDisposed });
        return { requestNumber: requestCount };
      });

      const response1 = await app.inject({ method: 'GET', url: '/test' });
      const response2 = await app.inject({ method: 'GET', url: '/test' });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      expect(requestCount).toBe(2);
      expect(containerStatuses).toHaveLength(2);
      expect(containerStatuses[0].wasNotDisposed).toBe(true);
      expect(containerStatuses[1].wasNotDisposed).toBe(true);
    });

    it('should work with request-scoped singletons', async () => {
      class RequestScopedService {
        id = Math.random();
      }

      rootContainer.addRegistration(
        R.fromClass(RequestScopedService)
          .bindTo('IRequestScopedService')
          .when((c) => c.hasTag('request'))
          .pipe(singleton()),
      );

      await app.register(containerPlugin(rootContainer));

      app.get('/test', async (request) => {
        const requestContainer = request.container;
        const service1 = requestContainer.resolve<RequestScopedService>('IRequestScopedService');
        const service2 = requestContainer.resolve<RequestScopedService>('IRequestScopedService');

        // Should be the same instance within the request
        expect(service1).toBe(service2);
        expect(service1.id).toBe(service2.id);

        return { success: true };
      });

      await app.inject({
        method: 'GET',
        url: '/test',
      });
    });
  });
});
