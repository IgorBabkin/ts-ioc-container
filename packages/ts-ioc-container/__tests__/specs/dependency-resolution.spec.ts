import 'reflect-metadata';
import {
  Container,
  ContainerDisposedError,
  DependencyNotFoundError,
  inject,
  register,
  Registration as R,
  singleton,
} from '../../lib';

@register(singleton())
class AuditLog {
  readonly events: string[] = [];

  record(event: string): void {
    this.events.push(event);
  }
}

class CreateUser {
  constructor(@inject('AuditLog') private readonly auditLog: AuditLog) {}

  execute(email: string): string[] {
    this.auditLog.record(`created:${email}`);
    return this.auditLog.events;
  }
}

describe('Spec: dependency resolution', () => {
  it('resolves a registered key and injects it into a constructor', () => {
    const container = new Container().addRegistration(R.fromClass(AuditLog)).addRegistration(R.fromClass(CreateUser));

    const service = container.resolve<CreateUser>('CreateUser');

    expect(service).toBeInstanceOf(CreateUser);
    expect(service.execute('admin@example.com')).toEqual(['created:admin@example.com']);
    expect(container.resolve<AuditLog>('AuditLog').events).toEqual(['created:admin@example.com']);
  });

  it('throws DependencyNotFoundError when no visible registration exists', () => {
    const container = new Container();

    expect(() => container.resolve('MissingService')).toThrowError(DependencyNotFoundError);
  });

  it('throws ContainerDisposedError after the container is disposed', () => {
    const container = new Container().addRegistration(R.fromValue('ready').bindToKey('Status'));

    expect(container.resolve('Status')).toBe('ready');

    container.dispose();

    expect(() => container.resolve('Status')).toThrowError(ContainerDisposedError);
  });
});
