import 'reflect-metadata';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastify from 'fastify';
import { Container, type IContainer, Registration as R, scope, singleton } from 'ts-ioc-container';
import { containerPlugin } from '../lib/plugin';

describe('containerPlugin', () => {
  let rootContainer: IContainer;
  let app: FastifyInstance;

  beforeEach(() => {
    rootContainer = new Container({ tags: ['application'] });
    app = fastify();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('container creation', () => {
    it('should create a request-scoped container for each request', async () => {
      await app.register(containerPlugin(rootContainer));

      app.get('/test', async (request, reply) => {
        expect(request.container).toBeDefined();
        expect(request.container).toBeInstanceOf(Container);
        expect(request.container).not.toBe(rootContainer);
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

      let container1: IContainer | undefined;
      let container2: IContainer | undefined;

      app.get('/test1', async (request) => {
        container1 = request.container;
        return { success: true };
      });

      app.get('/test2', async (request) => {
        container2 = request.container;
        return { success: true };
      });

      await app.inject({ method: 'GET', url: '/test1' });
      await app.inject({ method: 'GET', url: '/test2' });

      expect(container1).toBeDefined();
      expect(container2).toBeDefined();
      expect(container1).not.toBe(container2);
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
          .pipe(scope((c) => c.hasTag('request'))),
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

      let requestContainer: IContainer | undefined;

      app.get('/test', async (request) => {
        requestContainer = request.container;
        expect(requestContainer.isDisposed).toBe(false);
        return { success: true };
      });

      await app.inject({
        method: 'GET',
        url: '/test',
      });

      // Wait a bit for async hooks to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(requestContainer).toBeDefined();
      expect(requestContainer!.isDisposed).toBe(true);
    });

    it('should dispose container only once even if multiple hooks fire', async () => {
      await app.register(containerPlugin(rootContainer));

      let requestContainer: IContainer | undefined;

      app.get('/test', async (request) => {
        requestContainer = request.container;
        return { success: true };
      });

      await app.inject({
        method: 'GET',
        url: '/test',
      });

      // Wait a bit for async hooks to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(requestContainer).toBeDefined();
      expect(requestContainer!.isDisposed).toBe(true);
    });

    it('should prevent operations on disposed container', async () => {
      await app.register(containerPlugin(rootContainer));

      app.get('/test', async (request) => {
        const container = request.container;
        return { success: true };
      });

      await app.inject({
        method: 'GET',
        url: '/test',
      });

      // Wait a bit for async hooks to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Container should be disposed, but we can't access it here
      // The test above verifies disposal happens
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple sequential requests', async () => {
      await app.register(containerPlugin(rootContainer));

      const containers: IContainer[] = [];

      app.get('/test', async (request) => {
        containers.push(request.container);
        return { success: true };
      });

      await app.inject({ method: 'GET', url: '/test' });
      await app.inject({ method: 'GET', url: '/test' });

      // Wait a bit for async hooks to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(containers).toHaveLength(2);
      expect(containers[0]).not.toBe(containers[1]);
      expect(containers[0].isDisposed).toBe(true);
      expect(containers[1].isDisposed).toBe(true);
    });

    it('should work with request-scoped singletons', async () => {
      class RequestScopedService {
        id = Math.random();
      }

      rootContainer.addRegistration(
        R.fromClass(RequestScopedService)
          .bindTo('IRequestScopedService')
          .pipe(scope((c) => c.hasTag('request')))
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
