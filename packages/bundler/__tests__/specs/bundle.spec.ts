import path from 'node:path';
import * as ts from 'typescript';
import { Container, DependencyNotFoundError, type IContainerModule } from 'ts-ioc-container';
import { build, findConfigFiles, loadConfig } from '../../lib';
import { DevBundle } from '../fixtures/app/src/di/dev.bundle';
import { ProdBundle } from '../fixtures/app/src/di/prod.bundle';
import { TestBundle } from '../fixtures/app/src/di/test.bundle';
import { Greeter } from '@app/services/Greeter';
import { ILoggerToken } from '@app/infra/logging/ILogger';

const fixture = path.resolve(__dirname, '../fixtures/app');

// One app, one bundle per environment: each registers the same Greeter with its own ILogger.
const environments: [config: string, bundle: IContainerModule, logged: string][] = [
  ['prod.bundle.yml', new ProdBundle(), '{"message":"Hello, Ada!"}'],
  ['dev.bundle.yml', new DevBundle(), '[dev] Hello, Ada!'],
  ['test.bundle.yml', new TestBundle(), 'Hello, Ada!'],
];

describe('Story: Generate a bundle: a plain container module class', () => {
  it('describes one bundle per environment, all found at the package root', () => {
    expect(findConfigFiles(fixture).map((file) => path.basename(file))).toEqual([
      'dev.bundle.yml',
      'prod.bundle.yml',
      'test.bundle.yml',
    ]);
    expect(environments.map(([config]) => loadConfig(path.join(fixture, config)).tags)).toEqual([
      ['production'],
      ['development'],
      ['test'],
    ]);
  });

  it.each(environments)('%s is current: tic build --check finds nothing to regenerate', (config) => {
    const result = build({ config: path.join(fixture, config), check: true });

    expect(result.output.status).toBe('unchanged');
    expect(result.warnings).toEqual([]);
  });

  it('type-checks inside the consumer project, aliases included', () => {
    const { config } = ts.readConfigFile(path.join(fixture, 'tsconfig.json'), ts.sys.readFile);
    const { fileNames, options } = ts.parseJsonConfigFileContent(config, ts.sys, fixture);
    const program = ts.createProgram(fileNames, options);

    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));

    expect(diagnostics).toEqual([]);
  });

  it.each(environments)('%s registers the logger of its environment', (_config, bundle, logged) => {
    const container = new Container().useModule(bundle);

    container.resolve(Greeter).greet('Ada');

    expect(ILoggerToken.resolve(container).messages).toEqual([logged]);
    expect(() => container.resolve('Formatter')).toThrow(DependencyNotFoundError);
  });
});
