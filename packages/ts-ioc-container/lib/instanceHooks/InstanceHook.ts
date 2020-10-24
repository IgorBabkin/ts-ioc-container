import { IInstanceHook } from './IInstanceHook';
import { IInjectable } from './IInjectable';

export class InstanceHook implements IInstanceHook<IInjectable> {
    public onCreateInstance(instance: IInjectable): void {
        instance.postConstruct && instance.postConstruct();
    }

    public onRemoveInstance(instance: IInjectable): void {
        instance.dispose && instance.dispose();
    }
}
