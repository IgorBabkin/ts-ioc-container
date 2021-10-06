export const IHomeModelKey = Symbol.for('IHomeModel');

export interface IHomeModel {
    value: number;

    dispose(): void;
}
