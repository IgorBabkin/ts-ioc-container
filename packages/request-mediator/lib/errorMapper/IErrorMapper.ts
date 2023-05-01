import { DomainError } from './DomainError';
import { constructor } from 'ts-ioc-container';
import { getProp, prop } from 'ts-constructor-injector';
import { ErrorMapperNotFoundError } from './ErrorMapperNotFoundError';

export interface IErrorMapper<Context = unknown> {
    toDomain(error: unknown, context: Context): DomainError;
}

export const errorMapper =
    (ErrorMapper: constructor<IErrorMapper>): ClassDecorator =>
    (target) => {
        prop('errorMapper', new ErrorMapper(target.name))(target);
    };

export const mapError: MethodDecorator = (target, __, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
        const mapper = getProp<IErrorMapper>((target as any).constructor, 'errorMapper');
        if (!mapper) {
            throw new ErrorMapperNotFoundError(`Cannot find errorMapper for ${(target as any).name}`);
        }
        try {
            return await originalMethod.apply(this, args);
        } catch (e) {
            throw mapper.toDomain(e, { methodName: descriptor.value.name });
        }
    };
    return descriptor;
};
