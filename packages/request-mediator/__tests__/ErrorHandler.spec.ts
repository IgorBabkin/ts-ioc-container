import { Times } from 'moq.ts';
import { constructor } from 'ts-ioc-container';
import { ErrorHandler } from '../lib';
import { ArgumentNullError } from './ArgumentNullError';
import { createLooseMock } from './mock';
import { IErrorHandler } from '../lib/ErrorHandler';

// eslint-disable-next-line @typescript-eslint/ban-types
type ErrorContext = {
    logError(error: unknown): void;
};

class TestErrorHandler extends ErrorHandler<ErrorContext> {
    protected errors: constructor<Error>[] = [ArgumentNullError];

    protected handleError(error: Error, context: ErrorContext): void {
        context.logError(error);
    }
}

describe('ErrorHandler', function () {
    it('uses first available handler', () => {
        const error = new ArgumentNullError('asda');
        const contextMock = createLooseMock<ErrorContext>();
        const fallbackErrorHandlerMock = createLooseMock<IErrorHandler<ErrorContext>>();

        const handler = new TestErrorHandler(fallbackErrorHandlerMock.object());
        handler.handle(error, contextMock.object());

        contextMock.verify((instance) => instance.logError(error), Times.Once());
        fallbackErrorHandlerMock.verify((instance) => instance.handle(error, contextMock.object()), Times.Never());
    });

    it('uses fallback handler', () => {
        const error = new Error('asda');
        const contextMock = createLooseMock<ErrorContext>();
        const fallbackErrorHandlerMock = createLooseMock<IErrorHandler<ErrorContext>>();

        const handler = new TestErrorHandler(fallbackErrorHandlerMock.object());
        handler.handle(error, contextMock.object());

        contextMock.verify((instance) => instance.logError(error), Times.Never());
        fallbackErrorHandlerMock.verify((instance) => instance.handle(error, contextMock.object()), Times.Once());
    });
});
