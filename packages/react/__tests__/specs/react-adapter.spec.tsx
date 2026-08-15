import 'reflect-metadata';
import { useState, type ReactNode } from 'react';
import { act, render } from '@testing-library/react';
import {
  bindTo,
  Container,
  DependencyNotFoundError,
  type IContainer,
  register,
  Registration as R,
  scope,
  singleton,
  SingleToken,
} from 'ts-ioc-container';

import { OutOfScopeError, Scope, ScopeContext, useResolveOrFail, useScopeOrFail } from '../../lib';

interface IGreeter {
  greet(): string;
}

const IGreeterToken = new SingleToken<IGreeter>('IGreeter');

@register(bindTo(IGreeterToken), scope((c) => c.hasTag('widget')), singleton())
class Greeter implements IGreeter {
  greet(): string {
    return 'hello';
  }
}

class Counter {
  value = 0;
}

function createApp(): IContainer {
  return new Container({ tags: ['application'] }).addRegistration(R.fromClass(Greeter));
}

function Root({ container, children }: { container: IContainer; children: ReactNode }) {
  return <ScopeContext.Provider value={container}>{children}</ScopeContext.Provider>;
}

/** Renders `children` and hands back whatever the probe captured during render. */
function captureRender<T>(ui: ReactNode, read: () => T): T {
  render(ui);
  return read();
}

/** React logs render failures to the console; a failing render is the assertion here. */
function withSilencedConsole<T>(run: () => T): T {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    return run();
  } finally {
    spy.mockRestore();
  }
}

describe('Spec: React adapter', () => {
  describe('Story: bind a container to a component subtree', () => {
    it('reads the container put into ScopeContext from a component below it', () => {
      const app = createApp();
      let seen: IContainer | undefined;

      captureRender(
        <Root container={app}>
          {(() => {
            const Probe = () => {
              seen = useScopeOrFail();
              return null;
            };
            return <Probe />;
          })()}
        </Root>,
        () => seen,
      );

      expect(seen).toBe(app);
    });
  });

  describe('Story: create a child scope per subtree', () => {
    it('creates a child of the surrounding scope carrying every given tag', () => {
      const app = createApp();
      let child: IContainer | undefined;
      const Probe = () => {
        child = useScopeOrFail();
        return null;
      };

      captureRender(
        <Root container={app}>
          <Scope tags={['widget', 'form']}>
            <Probe />
          </Scope>
        </Root>,
        () => child,
      );

      expect(child).not.toBe(app);
      expect(child?.getParent()).toBe(app);
      expect(child?.hasTag('widget')).toBe(true);
      expect(child?.hasTag('form')).toBe(true);
    });

    it('keeps the same child scope across re-renders of the same Scope instance', () => {
      const app = createApp();
      const seen: IContainer[] = [];
      let rerender: (() => void) | undefined;

      const Probe = () => {
        seen.push(useScopeOrFail());
        return null;
      };
      const Host = () => {
        const [, setTick] = useState(0);
        rerender = () => setTick((t) => t + 1);
        return (
          <Scope tags={['widget']}>
            <Probe />
          </Scope>
        );
      };

      render(
        <Root container={app}>
          <Host />
        </Root>,
      );
      act(() => rerender?.());

      expect(seen.length).toBeGreaterThan(1);
      expect(new Set(seen).size).toBe(1);
    });

    it('chains nested Scope components into a matching chain of containers', () => {
      const app = createApp();
      let inner: IContainer | undefined;
      const Probe = () => {
        inner = useScopeOrFail();
        return null;
      };

      captureRender(
        <Root container={app}>
          <Scope tags={['page']}>
            <Scope tags={['widget']}>
              <Probe />
            </Scope>
          </Scope>
        </Root>,
        () => inner,
      );

      expect(inner?.hasTag('widget')).toBe(true);
      expect(inner?.getParent()?.hasTag('page')).toBe(true);
      expect(inner?.getParent()?.getParent()).toBe(app);
    });

    it('disposes the child scope when the Scope component unmounts', () => {
      const app = createApp();
      let child: IContainer | undefined;
      const Probe = () => {
        child = useScopeOrFail();
        return null;
      };

      const view = render(
        <Root container={app}>
          <Scope tags={['widget']}>
            <Probe />
          </Scope>
        </Root>,
      );
      expect(child?.isDisposed).toBe(false);

      view.unmount();

      expect(child?.isDisposed).toBe(true);
      expect(app.getScopes()).toHaveLength(0);
    });

    it('fails with OutOfScopeError when rendered without a surrounding scope', () => {
      expect(() =>
        withSilencedConsole(() =>
          render(
            <Scope tags={['widget']}>
              <div />
            </Scope>,
          ),
        ),
      ).toThrowError(OutOfScopeError);
    });
  });

  describe('Story: resolve dependencies from the surrounding scope', () => {
    it('resolves an injection token through the surrounding scope', () => {
      const app = createApp();
      let greeter: IGreeter | undefined;
      const Probe = () => {
        greeter = useResolveOrFail(IGreeterToken);
        return null;
      };

      captureRender(
        <Root container={app}>
          <Scope tags={['widget']}>
            <Probe />
          </Scope>
        </Root>,
        () => greeter,
      );

      expect(greeter?.greet()).toBe('hello');
    });

    it('resolves a class constructor through the surrounding scope', () => {
      const app = createApp();
      let counter: Counter | undefined;
      const Probe = () => {
        counter = useResolveOrFail(Counter);
        return null;
      };

      captureRender(
        <Root container={app}>
          <Probe />
        </Root>,
        () => counter,
      );

      expect(counter).toBeInstanceOf(Counter);
    });

    it('surfaces a container resolution failure unchanged', () => {
      const app = createApp();
      const Probe = () => {
        useResolveOrFail(IGreeterToken);
        return null;
      };

      expect(() =>
        withSilencedConsole(() =>
          render(
            <Root container={app}>
              <Probe />
            </Root>,
          ),
        ),
      ).toThrowError(DependencyNotFoundError);
    });
  });

  describe('Story: fail clearly outside a scope', () => {
    it('fails useScopeOrFail with OutOfScopeError when no scope is above it', () => {
      const Probe = () => {
        useScopeOrFail();
        return null;
      };

      expect(() => withSilencedConsole(() => render(<Probe />))).toThrowError(OutOfScopeError);
    });

    it('fails useResolveOrFail with OutOfScopeError when no scope is above it', () => {
      const Probe = () => {
        useResolveOrFail(IGreeterToken);
        return null;
      };

      expect(() => withSilencedConsole(() => render(<Probe />))).toThrowError(OutOfScopeError);
    });

    it('names the error so it stays recognizable after serialization', () => {
      const error = new OutOfScopeError('no scope');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(OutOfScopeError);
      expect(error.name).toBe('OutOfScopeError');
      expect(error.message).toBe('no scope');
    });
  });
});
