import { handleAsyncError, handleError, HandleErrorParams } from '../lib';

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

const networkToTestError: HandleErrorParams = (error, context) => {
    throw new TestError(error, context);
};

class AsyncRepo {
    @handleAsyncError(networkToTestError)
    async saveSmth() {
        await sleep(1000);
        throw new Error('error');
    }
}

class Repo {
    @handleError(networkToTestError)
    saveSmth() {
        throw new Error('error');
    }
}

describe('handleError', function () {
    it('should handle async error', async function () {
        const repo = new AsyncRepo();
        await expect(async () => await repo.saveSmth()).rejects.toThrowError(TestError);
    });

    it('should handle error', async function () {
        const repo = new Repo();
        await expect(async () => await repo.saveSmth()).rejects.toThrowError(TestError);
    });
});
