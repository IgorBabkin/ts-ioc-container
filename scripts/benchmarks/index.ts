#!/usr/bin/env bun

import 'reflect-metadata';
import { Bench } from 'tinybench';
import { Container, Registration, scopeAccess } from '../../lib';
import { BENCHMARK_CONFIG } from './config';
import { writeFileSync } from 'node:fs';

// Define task acronyms for benchmark identification
const TASK_ACRONYMS: Record<string, string> = {
  'Container creation': 'cont_create',
  'Container with 100 registrations': 'cont_reg',
  'Create 10 scopes': 'scope_create',
  'Resolve simple value 100 times': 'resolve_val',
  'Resolve class instance': 'resolve_class',
  'Resolve deep dependency chain': 'resolve_chain',
  'Provider with pipe transformations': 'provider_pipe',
  'Lazy resolution': 'lazy_resolve',
  'Resolve with aliases': 'resolve_alias',
  'Scope hierarchy resolution': 'scope_hierarchy',
  'Server scenario': 'server_scenario',
  'Client scenario': 'client_scenario',
};

// Parse command-line arguments
const args = process.argv.slice(2);
const reportOutput = args.includes('--report-output') ? args[args.indexOf('--report-output') + 1] : null;

// Define some test classes and interfaces for benchmarks
interface IGreeter {
  greet(name: string): string;
}

class Greeter implements IGreeter {
  constructor(private prefix = 'Hello') {}

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
  const bench = new Bench(BENCHMARK_CONFIG);

  // Benchmark 1: Container creation and basic registration
  bench.add('Container creation', () => {
    const container = new Container();
    container.dispose();
  });

  // Benchmark 2: Container with registrations
  bench.add('Container with 100 registrations', () => {
    const container = new Container();
    for (let i = 0; i < 100; i++) {
      container.addRegistration(Registration.fromFn(() => `value-${i}`).bindToKey(`key-${i}`));
    }
    container.dispose();
  });

  // Benchmark 3: Scope creation
  bench.add('Create 10 scopes', () => {
    const root = new Container();
    for (let i = 0; i < 10; i++) {
      root.addRegistration(Registration.fromFn(() => 'Hello World').bindToKey(`greeting-${i}`));
    }

    for (let i = 0; i < 10; i++) {
      root.createScope();
    }

    root.dispose();
  });

  // Benchmark 4: Simple resolution
  bench.add('Resolve simple value 100 times', () => {
    const container = new Container();
    container.addRegistration(Registration.fromValue('Hello World').bindToKey('greeting'));

    for (let i = 0; i < 100; i++) {
      container.resolveOne<string>('greeting');
    }

    container.dispose();
  });

  // Benchmark 5: Class resolution
  bench.add('Resolve class instance', () => {
    const container = new Container();
    container.addRegistration(Registration.fromClass(Greeter).bindToKey('greeter'));

    for (let i = 0; i < 100; i++) {
      container.resolveOne<Greeter>('greeter');
    }

    container.dispose();
  });

  // Benchmark 6: Deep dependency chain
  bench.add('Resolve deep dependency chain', () => {
    const container = new Container();

    container.addRegistration(Registration.fromClass(ConfigService).bindToKey('configService'));
    container.addRegistration(Registration.fromClass(ApiClient).bindToKey('apiClient'));
    container.addRegistration(Registration.fromClass(UserService).bindToKey('userService'));

    for (let i = 0; i < 50; i++) {
      container.resolveOne<UserService>('userService');
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
          scopeAccess(({ invocationScope }) => invocationScope.hasTag('api')),
        )
        .bindToKey('greeter'),
    );

    const scope = container.createScope({ tags: ['api'] });

    for (let i = 0; i < 50; i++) {
      scope.resolveOne<Greeter>('greeter');
    }

    container.dispose();
  });

  // Benchmark 8: Lazy resolution
  bench.add('Lazy resolution', () => {
    const container = new Container();
    container.addRegistration(Registration.fromClass(Greeter).bindToKey('greeter'));

    for (let i = 0; i < 50; i++) {
      container.resolveOne<Greeter>('greeter', { lazy: true });
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
          .bindToKey(`key-${i}`)
          .bindToAlias('valueAlias')
          .bindToAlias(`alias-${i}`),
      );
    }

    const child1 = container.createScope();
    for (let i = 0; i < numberOfRegistrations; i++) {
      const child2 = child1.createScope();
      const deps = child2.resolveByAlias('valueAlias');
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
    root.addRegistration(Registration.fromValue('root-value').bindToKey('shared'));

    const child1 = root.createScope();
    child1.addRegistration(Registration.fromValue('child1-value').bindToKey('child1-key'));

    const child2 = child1.createScope();
    child2.addRegistration(Registration.fromValue('child2-value').bindToKey('child2-key'));

    for (let i = 0; i < 50; i++) {
      // Resolve from parent
      child2.resolveOne<string>('shared');
      // Resolve from immediate parent
      child2.resolveOne<string>('child1-key');
      // Resolve from self
      child2.resolveOne<string>('child2-key');
    }

    root.dispose();
  });

  bench.add('Server scenario', () => {
    // Create root container with 10 dependencies
    const rootContainer = new Container();

    // Register 10 dependencies in the root container
    for (let i = 0; i < 10; i++) {
      rootContainer.addRegistration(
        Registration.fromFn(() => ({ id: i, name: `Service-${i}` })).bindToKey(`service-${i}`),
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
        scope.resolveOne(`service-${serviceIndex}`);
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
        Registration.fromFn(() => ({ id: i, name: `AppService-${i}` })).bindToKey(`app-service-${i}`),
      );
    }

    // Create 3 page scopes with "page" tag
    const pages = [];
    for (let pageIndex = 0; pageIndex < 3; pageIndex++) {
      // Create a page scope with "page" tag
      const pageScope = rootContainer.createScope({ tags: ['page'] });
      pages.push(pageScope);

      // Register page-specific services
      pageScope.addRegistration(Registration.fromValue({ pageId: `page-${pageIndex}` }).bindToKey('pageContext'));

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
          }).bindToKey('widgetContext'),
        );

        // Resolve 5 dependencies in each widget
        for (let depIndex = 0; depIndex < 5; depIndex++) {
          // Resolve a mix of app-level and page-level services
          if (depIndex % 2 === 0) {
            // Resolve app-level service
            const appServiceIndex = (depIndex + widgetIndex) % 20;
            widgetScope.resolveOne(`app-service-${appServiceIndex}`);
          } else {
            // Resolve page context
            widgetScope.resolveOne('pageContext');

            // Also resolve widget context
            if (depIndex === 3) {
              widgetScope.resolveOne('widgetContext');
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

  // Save report as JSON if --report-output is specified
  if (reportOutput) {
    try {
      const results = bench.table();

      // Add task IDs to the results and rename 'Task name' to 'name'
      const resultsWithIds = results.map((result) => {
        if (result && typeof result === 'object') {
          const taskName = result['Task name'];
          if (taskName && typeof taskName === 'string') {
            // Extract all properties except 'Task name' and create a new object with 'name' instead
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { 'Task name': _unused, ...otherProps } = result;

            // Improve latency and throughput field names
            const {
              'Latency avg (ns)': latencyAvgRaw,
              'Latency med (ns)': latencyMedRaw,
              'Throughput avg (ops/s)': throughputAvgRaw,
              'Throughput med (ops/s)': throughputMedRaw,
              Samples: samplesRaw,
              ...rest
            } = otherProps;

            // Parse latency and throughput values
            const parseMetric = (metricString: string | number | undefined) => {
              if (typeof metricString !== 'string') return { value: 0, error: 0 };

              // Extract numeric value and error margin
              const parts = metricString.split('±');
              if (parts.length !== 2) return { value: Number.parseFloat(metricString) || 0, error: 0 };

              const valueStr = parts[0].trim();
              const errorStr = parts[1].trim().replace('%', '');

              return {
                value: Number.parseFloat(valueStr) || 0,
                error: Number.parseFloat(errorStr) || 0,
              };
            };

            const latencyAvgParsed = parseMetric(latencyAvgRaw);
            const latencyMedParsed = parseMetric(latencyMedRaw);
            const throughputAvgParsed = parseMetric(throughputAvgRaw);
            const throughputMedParsed = parseMetric(throughputMedRaw);

            return {
              id: TASK_ACRONYMS[taskName] || taskName.replace(/\s+/g, '_').toLowerCase(),
              name: taskName,
              latency: {
                avg: latencyAvgParsed.value,
                avgError: latencyAvgParsed.error,
                med: latencyMedParsed.value,
                medError: latencyMedParsed.error,
                unit: 'ns',
              },
              throughput: {
                avg: throughputAvgParsed.value,
                avgError: throughputAvgParsed.error,
                med: throughputMedParsed.value,
                medError: throughputMedParsed.error,
                unit: 'ops/s',
              },
              samples: samplesRaw,
              ...rest,
            };
          }
        }
        return result;
      });

      const jsonReport = JSON.stringify(resultsWithIds, null, 2);
      writeFileSync(reportOutput, jsonReport);
      console.log(`Benchmark report saved to: ${reportOutput}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error saving benchmark report: ${errorMessage}`);
    }
  }
}

// Run the benchmark
runBenchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});
