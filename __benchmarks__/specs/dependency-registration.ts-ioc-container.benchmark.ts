import { bindTo, Container, register, Registration as R, singleton, toGroupAlias, toSingleAlias } from '../../lib';
import type { BenchmarkSpec } from './benchmark-types';

const TsIocBenchmarkSingleNotifier = toSingleAlias<TsIocBenchmarkNotifier>('TsIocBenchmarkSingleNotifier');
const TsIocBenchmarkNotifierGroup = toGroupAlias<TsIocBenchmarkNotifier>('TsIocBenchmarkNotifierGroup');

interface TsIocBenchmarkNotifier {
  channel: string;
}

@register(singleton())
class TsIocBenchmarkRepository {
  readonly source = 'db';
}

class TsIocBenchmarkService {
  constructor(readonly repository: TsIocBenchmarkRepository) {}
}

@register(bindTo(TsIocBenchmarkSingleNotifier), bindTo(TsIocBenchmarkNotifierGroup))
class TsIocBenchmarkEmailNotifier implements TsIocBenchmarkNotifier {
  readonly channel = 'email';
}

@register(bindTo(TsIocBenchmarkNotifierGroup))
class TsIocBenchmarkSmsNotifier implements TsIocBenchmarkNotifier {
  readonly channel = 'sms';
}

const createDependencyRegistrationContainer = () =>
  new Container()
    .addRegistration(R.fromClass(TsIocBenchmarkRepository))
    .addRegistration(R.fromValue({ env: 'benchmark' }).bindToKey('TsIocBenchmarkConfig'))
    .addRegistration(
      R.fromFn((scope) => new TsIocBenchmarkService(scope.resolve('TsIocBenchmarkRepository'))).bindToKey(
        'TsIocBenchmarkService',
      ),
    )
    .addRegistration(R.fromKey<TsIocBenchmarkService>('TsIocBenchmarkService').bindToKey('TsIocBenchmarkServiceAlias'))
    .addRegistration(R.fromClass(TsIocBenchmarkEmailNotifier))
    .addRegistration(R.fromClass(TsIocBenchmarkSmsNotifier));

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'dependency-registration.ts-ioc-container',
  name: 'Dependency registration - ts-ioc-container',
  description:
    'Creates a container with class, value, factory, key redirect, single alias, and group alias registrations.',
  taskName: 'Story: Register and resolve mixed dependency shapes',
  createTask: () => () => {
    const container = createDependencyRegistrationContainer();

    container.resolve<TsIocBenchmarkRepository>('TsIocBenchmarkRepository');
    container.resolve<{ env: string }>('TsIocBenchmarkConfig');
    container.resolve<TsIocBenchmarkService>('TsIocBenchmarkServiceAlias');
    TsIocBenchmarkSingleNotifier.resolve(container);
    TsIocBenchmarkNotifierGroup.resolve(container);
  },
};
