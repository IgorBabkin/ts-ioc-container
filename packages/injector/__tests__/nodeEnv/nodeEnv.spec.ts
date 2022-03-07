import 'reflect-metadata';
import { ProcessEnv } from './ProcessEnv';

describe('asdasd', function () {
    it('should asdasd', function () {
        const env = ProcessEnv.create({ SOME_VAR: 'hey' });
        expect(env.yardi.username).toBe('hey');
    });
});
