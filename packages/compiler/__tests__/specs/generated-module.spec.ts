import path from 'node:path';
import * as ts from 'typescript';
import { Container, DependencyNotFoundError } from 'ts-ioc-container';
import { build } from '../../lib';
import { AppModule, registrations } from '../fixtures/app/src/di/app.generated';
import { Greeter } from '@app/services/Greeter';
import { ILoggerToken } from '@app/infra/logging/ILogger';

const fixture = path.resolve(__dirname, '../fixtures/app');

describe('Story: Generate a plain container module', () => {
  it('is current: tic build --check finds nothing to regenerate', () => {
    const result = build({ config: path.join(fixture, 'tic.config.json'), check: true });

    expect(result.outputs.map((o) => o.status)).toEqual(['unchanged']);
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

  it('makes every discovered class resolvable, honouring its @register config', () => {
    const container = new Container().useModule(AppModule);

    container.resolve(Greeter).greet('Ada');

    expect(ILoggerToken.resolve(container).messages).toEqual(['Hello, Ada!']);
    expect(registrations).toHaveLength(2);
    expect(() => container.resolve('Formatter')).toThrow(DependencyNotFoundError);
  });
});
