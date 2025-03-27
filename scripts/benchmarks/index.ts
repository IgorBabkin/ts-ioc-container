#!/usr/bin/env bun

import { Bench } from 'tinybench';
import { Container, Registration, visible } from '../../lib';
import 'reflect-metadata';

// Define some test classes and interfaces for benchmarks
interface IGreeter {
  greet(name: string): string;
}

class Greeter implements IGreeter {
  constructor(private prefix: string = 'Hello') {}

  greet(name: string): string {
    return `${this.prefix}, ${name}!`;
  }
}

class ConfigService {
  getConfig() {
    return { apiUrl: 'https://api.example.com', timeout: 5000 };
  }
}

class ApiClient {
  constructor(private configService: ConfigService) {}

  getBaseUrl() {
    return this.configService.getConfig().apiUrl;
  }
}

class UserService {
  constructor(private apiClient: ApiClient) {}

  getUserUrl(id: string) {
    return `${this.apiClient.getBaseUrl()}/users/${id}`;
  }
}

async function runBenchmark(benchmark = 'default'): Promise<void> {
  console.log(`Running benchmark: ${benchmark}`);
  const bench = new Bench();

  // Benchmark 1: Container creation and basic registration
  bench.add('Container creation', () => {
    const container = new Container();
    container.dispose();
  });

  // Benchmark 2: Container with registrations
  bench.add('Container with 100 registrations', () => {
    const container = new Container();
    for (let i = 0; i < 100; i++) {
      container.addRegistration(Registration.fromFn(() => `value-${i}`).assignToKey(`key-${i}`));
    }
    container.dispose();
  });

  // Benchmark 3: Scope creation
  bench.add('Create 10 scopes', () => {
    const root = new Container();
    for (let i = 0; i < 10; i++) {
      root.addRegistration(Registration.fromFn(() => 'Hello World').assignToKey(`greeting-${i}`));
    }

    for (let i = 0; i < 10; i++) {
      root.createScope();
    }

    root.dispose();
  });

  // Benchmark 4: Simple resolution
  bench.add('Resolve simple value 100 times', () => {
    const container = new Container();
    container.addRegistration(Registration.fromValue('Hello World').assignToKey('greeting'));

    for (let i = 0; i < 100; i++) {
      container.resolve<string>('greeting');
    }

    container.dispose();
  });

  // Benchmark 5: Class resolution
  bench.add('Resolve class instance', () => {
    const container = new Container();
    container.addRegistration(Registration.fromClass(Greeter).assignToKey('greeter'));

    for (let i = 0; i < 100; i++) {
      container.resolve<Greeter>('greeter');
    }

    container.dispose();
  });

  // Benchmark 6: Deep dependency chain
  bench.add('Resolve deep dependency chain', () => {
    const container = new Container();

    container.addRegistration(Registration.fromClass(ConfigService).assignToKey('configService'));
    container.addRegistration(Registration.fromClass(ApiClient).assignToKey('apiClient'));
    container.addRegistration(Registration.fromClass(UserService).assignToKey('userService'));

    for (let i = 0; i < 50; i++) {
      container.resolve<UserService>('userService');
    }

    container.dispose();
  });

  // Benchmark 7: Provider with transformation
  bench.add('Provider with pipe transformations', () => {
    const container = new Container();

    container.addRegistration(
      Registration.fromClass(Greeter)
        .pipe(
          (provider) => provider.setArgs(() => ['Greetings']),
          visible(({ child }) => child.hasTag('api')),
        )
        .assignToKey('greeter'),
    );

    const scope = container.createScope({ tags: ['api'] });

    for (let i = 0; i < 50; i++) {
      scope.resolve<Greeter>('greeter');
    }

    container.dispose();
  });

  // Benchmark 8: Lazy resolution
  bench.add('Lazy resolution', () => {
    const container = new Container();
    container.addRegistration(Registration.fromClass(Greeter).assignToKey('greeter'));

    for (let i = 0; i < 50; i++) {
      container.resolve<Greeter>('greeter', { lazy: true });
    }

    container.dispose();
  });

  // Benchmark 9: Many registrations with aliases
  bench.add('Resolve with aliases', () => {
    const numberOfRegistrations = 10;
    const container = new Container();

    for (let i = 0; i < numberOfRegistrations; i++) {
      container.addRegistration(
        Registration.fromFn(() => `value-${i}`)
          .assignToKey(`key-${i}`)
          .assignToAliases('valueAlias', `alias-${i}`),
      );
    }

    const child1 = container.createScope();
    for (let i = 0; i < numberOfRegistrations; i++) {
      const child2 = child1.createScope();
      const deps = child2.resolveMany('valueAlias');
      if (deps.length !== numberOfRegistrations) {
        throw new Error(`Resolving ${deps.length} deps`);
      }
      child2.dispose();
    }

    child1.dispose();

    container.dispose();
  });

  // Benchmark 10: Scope hierarchy resolution
  bench.add('Scope hierarchy resolution', () => {
    const root = new Container();
    root.addRegistration(Registration.fromValue('root-value').assignToKey('shared'));

    const child1 = root.createScope();
    child1.addRegistration(Registration.fromValue('child1-value').assignToKey('child1-key'));

    const child2 = child1.createScope();
    child2.addRegistration(Registration.fromValue('child2-value').assignToKey('child2-key'));

    for (let i = 0; i < 50; i++) {
      // Resolve from parent
      child2.resolve<string>('shared');
      // Resolve from immediate parent
      child2.resolve<string>('child1-key');
      // Resolve from self
      child2.resolve<string>('child2-key');
    }

    root.dispose({ cascade: true });
  });

  bench.add('Server scenario', () => {
    // Create root container with 10 dependencies
    const rootContainer = new Container();

    // Register 10 dependencies in the root container
    for (let i = 0; i < 10; i++) {
      rootContainer.addRegistration(
        Registration.fromFn(() => ({ id: i, name: `Service-${i}` })).assignToKey(`service-${i}`),
      );
    }

    // Create 10 scopes, resolve 5 dependencies in each, then dispose each scope
    const scopes = [];
    for (let i = 0; i < 10; i++) {
      // Create a scope
      const scope = rootContainer.createScope();
      scopes.push(scope);

      // Resolve 5 dependencies in the scope
      for (let j = 0; j < 5; j++) {
        const serviceIndex = j % 10; // Ensure we don't go out of bounds
        scope.resolve(`service-${serviceIndex}`);
      }
    }

    // Dispose each scope individually
    for (const scope of scopes) {
      scope.dispose();
    }

    // Dispose the root container
    rootContainer.dispose();
  });

  bench.add('Client scenario', () => {
    // Create root container with 20 dependencies
    const rootContainer = new Container();

    // Register 20 dependencies in the root container
    for (let i = 0; i < 20; i++) {
      rootContainer.addRegistration(
        Registration.fromFn(() => ({ id: i, name: `AppService-${i}` })).assignToKey(`app-service-${i}`),
      );
    }

    // Create 3 page scopes with "page" tag
    const pages = [];
    for (let pageIndex = 0; pageIndex < 3; pageIndex++) {
      // Create a page scope with "page" tag
      const pageScope = rootContainer.createScope({ tags: ['page'] });
      pages.push(pageScope);

      // Register page-specific services
      pageScope.addRegistration(Registration.fromValue({ pageId: `page-${pageIndex}` }).assignToKey('pageContext'));

      // Create 10 widgets per page
      const widgets = [];
      for (let widgetIndex = 0; widgetIndex < 10; widgetIndex++) {
        // Create a widget scope
        const widgetScope = pageScope.createScope({ tags: ['widget'] });
        widgets.push(widgetScope);

        // Register widget-specific services
        widgetScope.addRegistration(
          Registration.fromValue({
            widgetId: `widget-${pageIndex}-${widgetIndex}`,
            type: `Widget-${widgetIndex % 5}`,
          }).assignToKey('widgetContext'),
        );

        // Resolve 5 dependencies in each widget
        for (let depIndex = 0; depIndex < 5; depIndex++) {
          // Resolve a mix of app-level and page-level services
          if (depIndex % 2 === 0) {
            // Resolve app-level service
            const appServiceIndex = (depIndex + widgetIndex) % 20;
            widgetScope.resolve(`app-service-${appServiceIndex}`);
          } else {
            // Resolve page context
            widgetScope.resolve('pageContext');

            // Also resolve widget context
            if (depIndex === 3) {
              widgetScope.resolve('widgetContext');
            }
          }
        }
      }

      // Dispose all widget scopes for this page
      for (const widget of widgets) {
        widget.dispose();
      }
    }

    // Dispose all page scopes
    for (const page of pages) {
      page.dispose();
    }

    // Dispose the root container
    rootContainer.dispose();
  });

  // Run the benchmarks
  await bench.run();

  // Output results
  console.table(bench.table());
}

// Run the benchmark
runBenchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});
