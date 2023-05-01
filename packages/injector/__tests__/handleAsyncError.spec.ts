import { handleAsyncError, HandleErrorParams } from '../lib';

function sleep(number: number) {
    return new Promise((resolve) => setTimeout(resolve, number));
}

class TestError extends Error {
    name = 'TestError';
    constructor(public error: unknown, public context: { target: string; method: string }) {
        super('asdasd');

        Object.setPrototypeOf(this, TestError.prototype);
    }
}

const networkToTestError: HandleErrorParams = (error: unknown, context: { target: string; method: string }) => {
    throw new TestError(error, context);
};

class Repo {
    @handleAsyncError(networkToTestError)
    async saveSmth() {
        await sleep(1000);
        throw new Error('error');
    }
}

describe('handleAsyncError', function () {
    it('should handle async error', async function () {
        const repo = new Repo();
        await expect(async () => await repo.saveSmth()).rejects.toThrowError(TestError);
    });
});
