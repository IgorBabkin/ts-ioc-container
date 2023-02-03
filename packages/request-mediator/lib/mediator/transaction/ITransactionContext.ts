import { getProp, prop } from 'ts-constructor-injector';
import { constructor } from 'ts-ioc-container';

export interface ITransactionContext {
    execute: <Response>(fn: (context: ITransactionContext) => Promise<Response>) => Promise<Response>;
}

export const ITransactionContextKey = Symbol('ITransactionContext');

export const transaction: ClassDecorator = prop('transaction', true);

export function isTransaction(TargetAction: constructor<unknown>): boolean {
    return getProp<boolean>(TargetAction, 'transaction') || false;
}
