import 'reflect-metadata';
import { Container, Registration as R, SingleToken } from 'ts-ioc-container';

import { type Advice, type IIdGenerator, type IRepository, preparing, withId } from '../lib';

type NoteDto = { id: string; text: string; tenant?: string };

class NoteRepository implements IRepository<NoteDto> {
  readonly entityName = 'Note';
  readonly #rows = new Map<string, NoteDto>();

  async findById(id: string): Promise<NoteDto | undefined> {
    return this.#rows.get(id);
  }

  async create(note: NoteDto): Promise<NoteDto> {
    this.#rows.set(note.id, note);
    return note;
  }

  async update(stored: NoteDto, diff: Partial<NoteDto>): Promise<NoteDto> {
    return { ...stored, ...diff };
  }

  async delete(): Promise<void> {}
}

const IIdsToken = new SingleToken<IIdGenerator<string>>('IIds');
const ITenantToken = new SingleToken<string>('ITenant');

const scopeWith = (tenant: string) => {
  let last = 0;
  return new Container()
    .addRegistration(R.fromValue<IIdGenerator<string>>({ next: async () => `n-${++last}` }).bindTo(IIdsToken))
    .addRegistration(R.fromValue(tenant).bindTo(ITenantToken));
};

const withTenant: Advice<object, { tenant: string }> = (scope) => (value) => ({
  ...value,
  tenant: ITenantToken.resolve(scope),
});

describe('preparing', () => {
  it('runs the advices in order, each resolving what it needs from the given scope', async () => {
    const repository = preparing(withId(IIdsToken), withTenant)(new NoteRepository(), scopeWith('acme'));

    await expect(repository.prepare!({ text: 'Hi' } as never)).resolves.toEqual({
      id: 'n-1',
      text: 'Hi',
      tenant: 'acme',
    });
  });

  it('runs after the repository’s own prepare', async () => {
    class Stamped extends NoteRepository {
      async prepare(note: { text: string }): Promise<NoteDto> {
        return { ...note, id: 'own', text: note.text.toUpperCase() };
      }
    }

    const repository = preparing<Stamped>(withTenant)(new Stamped(), scopeWith('acme'));

    await expect(repository.prepare({ text: 'hi' })).resolves.toEqual({ id: 'own', text: 'HI', tenant: 'acme' });
  });

  it('answers the repository as itself: #private fields and class keep working', async () => {
    const plain = new NoteRepository();
    const repository = preparing(withId(IIdsToken))(plain, scopeWith('acme'));

    await repository.create({ id: 'n-9', text: 'Saved' });

    expect(repository).toBeInstanceOf(NoteRepository);
    expect(await plain.findById('n-9')).toEqual({ id: 'n-9', text: 'Saved' });
    expect(await repository.findById('n-9')).toEqual({ id: 'n-9', text: 'Saved' });
  });
});
