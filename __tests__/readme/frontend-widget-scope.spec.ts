import 'reflect-metadata';
import { bindTo, Container, inject, register, Registration as R, select, singleton } from '../../lib';

/**
 * Frontend Widget - Page Scope with Lazy Dependency
 *
 * In frontend applications, feature flags are fetched once per page load
 * (singleton per page scope) but a widget may not need them on every render.
 * Lazy injection defers instantiation until the widget actually reads the flags,
 * avoiding unnecessary work for widgets that never display flag-gated content.
 *
 * Scope hierarchy:
 *   Application
 *     └── Page (singleton flags fetched once)
 *           └── Widget (lazy flag access)
 */

@register(bindTo('FeatureFlags'), singleton())
class FeatureFlags {
  load(): Record<string, boolean> {
    return { newDashboard: true };
  }
}

class Widget {
  constructor(@inject(select.token('FeatureFlags').lazy()) public flags: FeatureFlags) {}
}

describe('Frontend widget/page scope with lazy dependency', () => {
  function createPage() {
    return new Container({ tags: ['page'] })
      .addRegistration(R.fromClass(FeatureFlags))
      .addRegistration(R.fromClass(Widget));
  }

  it('should not instantiate FeatureFlags until the widget actually accesses it', () => {
    const page = createPage();

    const widget = page.resolve(Widget);

    // Widget is resolved, but FeatureFlags has not been instantiated yet
    let instances = Array.from(page.getInstances()).filter((x) => x instanceof FeatureFlags);
    expect(instances).toHaveLength(0);

    // Accessing any property on the lazy proxy triggers instantiation
    const _load = widget.flags.load;
    expect(_load).toBeDefined();

    instances = Array.from(page.getInstances()).filter((x) => x instanceof FeatureFlags);
    expect(instances).toHaveLength(1);
  });

  it('should share the same FeatureFlags singleton across widgets on the same page', () => {
    const page = createPage();

    const widget1 = page.resolve(Widget);
    const widget2 = page.resolve(Widget);

    // Trigger instantiation through both widgets
    const _load1 = widget1.flags.load;
    const _load2 = widget2.flags.load;
    expect(_load1).toBeDefined();
    expect(_load2).toBeDefined();

    // Only one FeatureFlags instance was created across the whole page scope
    const instances = Array.from(page.getInstances()).filter((x) => x instanceof FeatureFlags);
    expect(instances).toHaveLength(1);
  });
});
