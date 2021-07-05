import { IProviderRepository } from '../lib';
import { MoqRepository } from './MoqRepository';
import { Times } from 'moq.ts';
import { createMock } from './MoqProvider';

describe('MockRepository', function () {
    test('dispose', () => {
        const providerRepositoryMock = createMock<IProviderRepository>();

        const moqRepository = new MoqRepository(providerRepositoryMock.object());
        moqRepository.dispose();

        providerRepositoryMock.verify((i) => i.dispose(), Times.Once());
    });
});
