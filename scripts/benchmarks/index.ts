#!/usr/bin/env bun

import { Bench } from 'tinybench';
import { Container, Registration, Provider, visible, args, argsFn } from '../../lib';
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
    const container = new Container();

    for (let i = 0; i < 20; i++) {
      container.addRegistration(
        Registration.fromFn(() => `value-${i}`)
          .assignToKey(`key-${i}`)
          .assignToAliases('valueAlias', `alias-${i}`),
      );
    }

    for (let i = 0; i < 20; i++) {
      container.resolveMany('valueAlias');
    }

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
