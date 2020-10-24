import faker from 'faker';

export class FakeGenerator {
    public randomName(): string {
        return faker.name.firstName();
    }
}
