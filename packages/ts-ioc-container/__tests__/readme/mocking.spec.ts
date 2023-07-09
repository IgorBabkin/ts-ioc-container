import { AutoMockedContainer, Container, DependencyKey, ReflectionInjector } from 'ts-ioc-container'
import { IMock, Mock } from 'moq.ts'

export class MoqContainer extends AutoMockedContainer {
  private mocks = new Map<DependencyKey, IMock<any>>()

  resolve<T>(key: DependencyKey): T {
    return this.resolveMock<T>(key).object()
  }

  resolveMock<T>(key: DependencyKey): IMock<T> {
    if (!this.mocks.has(key)) {
      this.mocks.set(key, new Mock())
    }
    return this.mocks.get(key) as IMock<T>
  }
}

interface IEngine {
  getRegistrationNumber(): string
}

describe('Mocking', () => {
  it('should auto-mock dependencies', () => {
    const mockContainer = new MoqContainer()
    const container = new Container(new ReflectionInjector(), { parent: mockContainer })

    const engineMock = mockContainer.resolveMock<IEngine>('IEngine')
    engineMock.setup((i) => i.getRegistrationNumber()).returns('123')

    const engine = container.resolve<IEngine>('IEngine')

    expect(engine.getRegistrationNumber()).toBe('123')
  })
})
