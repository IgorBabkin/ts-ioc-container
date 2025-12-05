import {
  AddOnConstructHookModule,
  Container,
  HookContext,
  HookFn,
  inject,
  onConstruct,
  Registration as R,
} from '../../lib';

const execute: HookFn = (ctx: HookContext) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

class Car {
  private engine!: string;

  @onConstruct(execute)
  setEngine(@inject('engine') engine: string) {
    this.engine = engine;
  }

  getEngine() {
    return this.engine;
  }
}

describe('onConstruct', function () {
  it('should run methods and resolve arguments from container', function () {
    const root = new Container()
      .useModule(new AddOnConstructHookModule())
      .addRegistration(R.fromValue('bmw').bindTo('engine'));

    const car = root.resolve(Car);

    expect(car.getEngine()).toBe('bmw');
  });
});
