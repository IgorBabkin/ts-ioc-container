import { It, Mock, Times } from 'moq.ts';
import { ExceptionHandler, type ILogger, TicConfigError } from '../../lib';

describe('ExceptionHandler', () => {
  const logger = () => new Mock<ILogger>().setup((m) => m.error(It.IsAny())).returns(undefined);

  it('given a TicError when handled then its message alone is reported and the exit code is 1', () => {
    const log = logger();

    const code = new ExceptionHandler(log.object()).handleError(
      new TicConfigError('bundles: expected a non-empty array'),
    );

    expect(code).toBe(1);
    log.verify((m) => m.error('bundles: expected a non-empty array'), Times.Once());
  });

  it('given an unexpected error when handled then it is reported with its stack', () => {
    const log = logger();
    const error = new Error('boom');

    expect(new ExceptionHandler(log.object()).handleError(error)).toBe(1);
    log.verify((m) => m.error(error.stack!), Times.Once());
  });

  it('given TicErrors when inspected then each carries a stable code', () => {
    expect(new TicConfigError('x')).toMatchObject({ code: 'INVALID_CONFIG', name: 'TicConfigError' });
  });
});
