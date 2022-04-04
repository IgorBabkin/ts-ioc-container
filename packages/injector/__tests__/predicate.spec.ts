import 'reflect-metadata';
import { getPredicate, predicate } from '../lib';
import { EntityNotFoundError } from '../lib/errors/EntityNotFoundError';

describe('predicate', function () {
    it('should get predicate of class by constructor', function () {
        @predicate((value) => !value)
        class TestClass {}

        const instance = new TestClass();
        const predicate1 = getPredicate(instance.constructor as any);
        expect(predicate1(false)).toBe(true);
    });

    it('should get predicate of class', function () {
        @predicate((value) => !value)
        class TestClass {}

        const predicate1 = getPredicate(TestClass);
        expect(predicate1(false)).toBe(true);
    });

    it('should throw an error if predicate is not provided', function () {
        class TestClass {}

        const instance = new TestClass();
        expect(() => getPredicate(instance.constructor as any)).toThrowError(EntityNotFoundError);
    });
});
