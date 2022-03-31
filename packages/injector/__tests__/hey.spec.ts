import 'reflect-metadata';
import {
    inject as injectFn,
    InjectionDecorator,
    InjectionPropertyDecorator,
    injectProperty,
    pipeWrite as pipe,
    prop,
    resolve,
    WriteFn,
} from '../lib';
import { toOneOf } from '../lib/utils';

export type NodeEnv = Record<string, string | undefined>;
export const inject: InjectionDecorator<Record<string, any>> = injectFn;
export const injectProp: InjectionPropertyDecorator<Record<string, any>, HasCommunityType> = injectProperty;

export const env =
    (key: string): WriteFn<NodeEnv, string | undefined> =>
    ([value, logs]) => {
        return [value[key], [...logs, `ENV ${key}`]];
    };

@prop('predicate', (q: HasCommunityType) => q.communityType === CommunityType.Yardi)
class Yardi {
    constructor(@inject(pipe(env('database'))) public database: string) {}
}

@prop('predicate', (q: HasCommunityType) => q.communityType === CommunityType.Resman)
class Resman {
    constructor(@inject(pipe(env('server_name'))) public serverName: string) {}
}

export enum CommunityType {
    Yardi = 'yardi',
    Resman = 'resman',
}

interface HasCommunityType {
    communityType: CommunityType;
}

describe('dasdad', function () {
    it('should asdasd', function () {
        class Query {
            @injectProp(toOneOf(Yardi, Resman))
            integration: Yardi | Resman;

            constructor(@inject(pipe(env('community_type'))) private communityType: CommunityType) {}
        }

        const query = resolve({ community_type: CommunityType.Resman, server_name: 'prod', database: '127.0.0.1' })(
            Query,
        );

        // expect(query.integration).toBeInstanceOf(Yardi);
        // expect((query.integration as Yardi).database).toBe('127.0.0.1');

        expect(query.integration).toBeInstanceOf(Resman);
        expect((query.integration as Resman).serverName).toBe('prod');
    });
});
