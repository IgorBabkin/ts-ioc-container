import 'reflect-metadata';
import { inject, matchContext, pipeWrite as pipe, resolve, toWrite as to } from '../lib';

interface IPerson {
    firstName: string;
    lastName: string;
}

describe('collection', function () {
    it('should map the context', function () {
        @matchContext((c: any) => c.type === 'A')
        class PersonA implements IPerson {
            constructor(
                @inject((p: any) => p.firstName) public firstName: string,
                @inject((p: any) => p.lastName) public lastName: string,
            ) {}
        }

        @matchContext((c: any) => c.type === 'B')
        class PersonB implements IPerson {
            constructor(
                @inject((p: any) => p.firstName) public firstName: string,
                @inject((p: any) => p.lastName) public lastName: string,
            ) {}
        }

        class Consumer {
            constructor(@inject(pipe(to(PersonA, PersonB))) public person: IPerson) {}
        }

        const consumer = resolve({ firstName: 'John', lastName: 'Doe', type: 'B' })(Consumer);
        expect(consumer.person).toBeInstanceOf(PersonB);
        expect(consumer.person.firstName).toBe('John');
    });
});
