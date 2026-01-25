# Performance Benchmarks

This directory contains performance benchmarks comparing `ts-ioc-container` with `tsyringe`, a popular TypeScript dependency injection library by Microsoft.

## Running Benchmarks

### Run All Benchmarks

```bash
pnpm run benchmark
```

This will run all benchmark suites sequentially and generate results in both JSON and HTML formats.

### Run Individual Benchmarks

```bash
pnpm exec ts-node benchmarks/simple-resolution.benchmark.ts
pnpm exec ts-node benchmarks/singleton.benchmark.ts
pnpm exec ts-node benchmarks/deep-tree.benchmark.ts
pnpm exec ts-node benchmarks/scoped.benchmark.ts
pnpm exec ts-node benchmarks/multiple-resolutions.benchmark.ts
```

## Benchmark Suites

### 1. Simple Resolution (`simple-resolution.benchmark.ts`)

**What it measures:** Basic dependency resolution performance.

- TSyringe: Resolve a simple service class
- ts-ioc-container: Resolve a simple service by key

**Use case:** Understanding baseline performance for single dependency resolution.

### 2. Singleton Resolution (`singleton.benchmark.ts`)

**What it measures:** Cached singleton resolution performance.

- TSyringe: Resolve singleton using `@singleton()` decorator
- ts-ioc-container: Resolve singleton using `singleton()` pipe

**Use case:** Performance of resolving cached instances (common in production).

### 3. Deep Dependency Tree (`deep-tree.benchmark.ts`)

**What it measures:** Performance with complex dependency graphs.

- Both libraries: Resolve a root service with 5 levels of nested dependencies
- Tests constructor injection through multiple layers

**Use case:** Real-world applications with deep dependency chains.

### 4. Scoped Containers (`scoped.benchmark.ts`)

**What it measures:** Child container/scope creation and resolution.

- TSyringe: Create child container and resolve scoped service
- ts-ioc-container: Create tagged scope and resolve scoped service

**Use case:** Request-scoped dependencies in web applications.

### 5. Multiple Resolutions (`multiple-resolutions.benchmark.ts`)

**What it measures:** Transient (non-cached) resolution performance at scale.

- Both libraries: Resolve the same transient dependency 100 times
- Each resolution creates a new instance

**Use case:** High-throughput scenarios with frequent dependency resolution.

## Understanding Results

Benny outputs results in two formats:

### 1. Console Output

Shows operations per second (ops/sec) and relative performance:

```
Suite: Simple Dependency Resolution
  tsyringe - resolve simple service x 1,234,567 ops/sec ±0.50%
  ts-ioc-container - resolve simple service x 987,654 ops/sec ±0.75% (slower by 20%)
```

### 2. HTML Charts

Generated HTML files in `benchmark/results/*.html` provide visual comparisons:

- Open in a browser to see interactive charts
- Compare relative performance across libraries
- View statistical data (mean, median, standard deviation)

## Interpreting Performance

### What to Look For

- **Operations per second**: Higher is better
- **Relative performance**: Percentage difference between libraries
- **Standard deviation**: Lower is more consistent

### Performance Considerations

1. **Absolute numbers matter less than patterns**
   - A 10% difference is usually negligible in real applications
   - Look for order-of-magnitude differences

2. **Real-world context**
   - Most apps resolve dependencies during initialization, not per-request
   - Singleton performance is often more important than transient
   - Scope creation overhead matters in high-traffic scenarios

3. **Trade-offs**
   - Raw speed vs. features (type safety, scoping flexibility, hooks)
   - Bundle size and developer experience also matter

## Library Feature Comparison

| Feature                    | ts-ioc-container | tsyringe |
| -------------------------- | :--------------: | :------: |
| Constructor Injection      |        ✅         |    ✅     |
| Singleton                  |        ✅         |    ✅     |
| Transient                  |        ✅         |    ✅     |
| Scoped (Child Containers)  |        ✅         |    ✅     |
| Tagged Scopes              |        ✅         |    ❌     |
| Lifecycle Hooks            |        ✅         |    ❌     |
| Scope Access Rules         |        ✅         |    ❌     |
| Provider Transformations   |        ✅         |    ❌     |
| Lazy Resolution            |        ✅         |    ❌     |
| Property Injection         |        ✅         |    ✅     |
| Token-based Resolution     |        ✅         |    ✅     |
| Zero Runtime Dependencies* |        ✅         |    ❌     |

\* Except `reflect-metadata` required by both

## Technical Details

### Benchmarking Framework

Uses [benny](https://github.com/caderek/benny) for accurate performance measurement:

- Based on [Benchmark.js](https://benchmarkjs.com/)
- Statistical analysis with multiple iterations
- Accounts for V8 optimizations and garbage collection
- Provides both JSON and HTML output formats

### Environment

Benchmarks should be run in a consistent environment:

- Single-threaded Node.js process
- No other heavy processes running
- Same TypeScript compilation settings
- Same decorator/metadata configuration

### Caveats

- Performance varies by Node.js version, CPU, and system load
- Results represent microbenchmarks, not full application performance
- Real-world performance depends on application architecture
- Both libraries use `reflect-metadata`, which impacts all results equally

## Contributing

When adding new benchmarks:

1. Create a new `*.benchmark.ts` file in this directory
2. Use the same benny configuration pattern
3. Ensure fair comparison (equivalent functionality)
4. Add documentation to this README
5. Update the feature comparison table if needed

## Resources

- [ts-ioc-container Documentation](https://igorbabkin.github.io/ts-ioc-container)
- [tsyringe Documentation](https://github.com/microsoft/tsyringe)
- [benny Benchmarking Tool](https://github.com/caderek/benny)
