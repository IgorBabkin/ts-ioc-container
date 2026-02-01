import 'reflect-metadata';
import type { Request, Response, NextFunction } from 'express';
import { Container, type IContainer, Registration as R, scope, singleton } from 'ts-ioc-container';
import { containerMiddleware } from '../lib/middleware';

describe('containerMiddleware', () => {
  let rootContainer: IContainer;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let finishHandlers: Array<() => void>;
  let closeHandlers: Array<() => void>;

  beforeEach(() => {
    rootContainer = new Container({ tags: ['application'] });

    finishHandlers = [];
    closeHandlers = [];

    mockRequest = {};

    mockResponse = {
      writableEnded: false,
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'finish') {
          finishHandlers.push(handler);
        } else if (event === 'close') {
          closeHandlers.push(handler);
        }
        return mockResponse as Response;
      }),
    };

    mockNext = jest.fn();
  });

  describe('container creation', () => {
    it('should create a request-scoped container for each request', () => {
      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.container).toBeDefined();
      expect(mockRequest.container).toBeInstanceOf(Container);
      expect(mockRequest.container).not.toBe(rootContainer);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should create container with default "request" tag', () => {
      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const requestContainer = mockRequest.container as IContainer;
      expect(requestContainer.hasTag('request')).toBe(true);
    });

    it('should create container with custom tags', () => {
      const middleware = containerMiddleware(rootContainer, { tags: ['custom', 'request'] });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const requestContainer = mockRequest.container as IContainer;
      expect(requestContainer.hasTag('custom')).toBe(true);
      expect(requestContainer.hasTag('request')).toBe(true);
    });

    it('should create isolated containers for different requests', () => {
      const middleware = containerMiddleware(rootContainer);

      const req1 = {} as Request;
      const req2 = {} as Request;
      const res1 = { ...mockResponse } as Response;
      const res2 = { ...mockResponse } as Response;

      middleware(req1, res1, mockNext);
      middleware(req2, res2, mockNext);

      expect(req1.container).toBeDefined();
      expect(req2.container).toBeDefined();
      expect(req1.container).not.toBe(req2.container);
    });

    it('should create container that can resolve dependencies from root container', () => {
      const rootService = { name: 'RootService' };
      rootContainer.addRegistration(R.fromValue(rootService).bindTo('IRootService'));

      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const requestContainer = mockRequest.container as IContainer;
      const resolved = requestContainer.resolve<typeof rootService>('IRootService');

      expect(resolved).toBe(rootService);
    });

    it('should create container that can have request-scoped dependencies', () => {
      const requestService = { requestId: 'req-123' };
      rootContainer.addRegistration(
        R.fromValue(requestService)
          .bindTo('IRequestService')
          .pipe(scope((c) => c.hasTag('request'))),
      );

      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const requestContainer = mockRequest.container as IContainer;
      const resolved = requestContainer.resolve<typeof requestService>('IRequestService');

      expect(resolved).toBe(requestService);
    });
  });

  describe('container disposal', () => {
    it('should dispose container when response finishes', () => {
      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const requestContainer = mockRequest.container as IContainer;
      expect(requestContainer.isDisposed).toBe(false);

      // Simulate response finish
      finishHandlers.forEach((handler) => handler());

      expect(requestContainer.isDisposed).toBe(true);
    });

    it('should dispose container when response closes without ending', () => {
      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const requestContainer = mockRequest.container as IContainer;
      expect(requestContainer.isDisposed).toBe(false);

      // Simulate response close without ending
      (mockResponse as Partial<Response>).writableEnded = false;
      closeHandlers.forEach((handler) => handler());

      expect(requestContainer.isDisposed).toBe(true);
    });

    it('should not dispose container twice on close if response already ended', () => {
      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const requestContainer = mockRequest.container as IContainer;

      // Simulate response finish first
      finishHandlers.forEach((handler) => handler());
      expect(requestContainer.isDisposed).toBe(true);

      // Simulate response close after finish (should not dispose again)
      (mockResponse as Partial<Response>).writableEnded = true;
      const disposeSpy = jest.spyOn(requestContainer, 'dispose');
      closeHandlers.forEach((handler) => handler());

      // dispose should not be called again
      expect(disposeSpy).not.toHaveBeenCalled();
    });

    it('should dispose container only once even if both events fire', () => {
      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const requestContainer = mockRequest.container as IContainer;
      const disposeSpy = jest.spyOn(requestContainer, 'dispose');

      // Simulate both finish and close
      finishHandlers.forEach((handler) => handler());
      (mockResponse as Partial<Response>).writableEnded = false;
      closeHandlers.forEach((handler) => handler());

      // dispose should be called only once
      expect(disposeSpy).toHaveBeenCalledTimes(1);
      expect(requestContainer.isDisposed).toBe(true);
    });

    it('should prevent operations on disposed container', () => {
      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const requestContainer = mockRequest.container as IContainer;

      // Simulate response finish
      finishHandlers.forEach((handler) => handler());

      // Try to resolve after disposal
      expect(() => {
        requestContainer.resolve('SomeKey');
      }).toThrow();
    });
  });

  describe('event handlers', () => {
    it('should register finish event handler', () => {
      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should register close event handler', () => {
      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should call next() immediately', () => {
      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple sequential requests', () => {
      const middleware = containerMiddleware(rootContainer);

      // First request
      const req1 = {} as Request;
      const res1 = { ...mockResponse } as Response;
      const next1 = jest.fn();
      middleware(req1, res1, next1);

      const container1 = req1.container as IContainer;
      expect(container1.isDisposed).toBe(false);

      // Finish first request
      finishHandlers.forEach((handler) => handler());
      expect(container1.isDisposed).toBe(true);

      // Second request
      const req2 = {} as Request;
      const res2 = { ...mockResponse } as Response;
      const next2 = jest.fn();
      middleware(req2, res2, next2);

      const container2 = req2.container as IContainer;
      expect(container2.isDisposed).toBe(false);
      expect(container2).not.toBe(container1);
    });

    it('should work with request-scoped singletons', () => {
      class RequestScopedService {
        id = Math.random();
      }

      rootContainer.addRegistration(
        R.fromClass(RequestScopedService)
          .bindTo('IRequestScopedService')
          .pipe(scope((c) => c.hasTag('request')))
          .pipe(singleton()),
      );

      const middleware = containerMiddleware(rootContainer);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const requestContainer = mockRequest.container as IContainer;
      const service1 = requestContainer.resolve<RequestScopedService>('IRequestScopedService');
      const service2 = requestContainer.resolve<RequestScopedService>('IRequestScopedService');

      // Should be the same instance within the request
      expect(service1).toBe(service2);
      expect(service1.id).toBe(service2.id);
    });
  });
});
