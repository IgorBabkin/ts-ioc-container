import { It, Mock } from 'moq.ts';
import { BundleView, type DiscoveredClass, type IRenderService } from '../../../lib';

const discovered = (file: string, exportName: string, specifier: string) =>
  ({
    file,
    exportName,
    localName: exportName,
    className: exportName,
    isDefault: false,
    specifier,
  }) as DiscoveredClass & { specifier: string };

describe('BundleView', () => {
  it('given selected classes when rendered then the bundle protocol renders one import per file', () => {
    const rendered: { protocol?: string; data?: unknown } = {};
    const renderer = new Mock<IRenderService>()
      .setup((m) => m.render(It.IsAny(), It.IsAny()))
      .callback(({ args: [protocol, data] }) => {
        Object.assign(rendered, { protocol, data });
        return '// bundle';
      });
    const view = new BundleView(renderer.object());

    const content = view.render({
      name: 'AppBundle',
      paths: ['@app/services'],
      classes: [
        discovered('/repo/src/services/Greeter.ts', 'Greeter', '@app/services/Greeter'),
        discovered('/repo/src/services/Greeter.ts', 'Farewell', '@app/services/Greeter'),
        discovered('/repo/src/services/Mailer.ts', 'Mailer', '@app/services/Mailer'),
      ],
    });

    expect(content).toBe('// bundle');
    expect(rendered).toEqual({
      protocol: 'Bundle.ts.hbs',
      data: {
        paths: ['@app/services'],
        name: 'AppBundle',
        imports: [
          { specifier: '@app/services/Greeter', named: ['Greeter', 'Farewell'] },
          { specifier: '@app/services/Mailer', named: ['Mailer'] },
        ],
        registrations: ['Greeter', 'Farewell', 'Mailer'],
      },
    });
  });

  it('given a class named like a runtime import when rendered then its binding is renamed', () => {
    const renderer = new Mock<IRenderService>().setup((m) => m.render(It.IsAny(), It.IsAny())).returns('');
    const view = new BundleView(renderer.object());

    view.render({
      name: 'AppBundle',
      paths: ['@app/di'],
      classes: [discovered('/repo/src/di/Registration.ts', 'Registration', '@app/di/Registration')],
    });

    renderer.verify((m) =>
      m.render(
        'Bundle.ts.hbs',
        It.Is(
          (data: { imports: { named: string[] }[]; registrations: string[] }) =>
            data.imports[0].named[0] === 'Registration as Registration_2' && data.registrations[0] === 'Registration_2',
        ),
      ),
    );
  });
});
