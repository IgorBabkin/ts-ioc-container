import 'reflect-metadata';
import * as benny from 'benny';
import runTsyringe from './deep-tree/deep-tree.tsyringe';
import runTsIocContainer from './deep-tree/deep-tree.tsyringe';

// Benchmark
benny.suite(
  'Deep Dependency Tree Resolution',

  benny.add('tsyringe - resolve deep tree (5 levels)', runTsyringe),

  benny.add('ts-ioc-container - resolve deep tree (5 levels)', runTsIocContainer),

  benny.cycle(),
  benny.complete(),
  benny.save({ file: 'deep-tree', version: '1.0.0' }),
  benny.save({ file: 'deep-tree', format: 'chart.html' }),
);
