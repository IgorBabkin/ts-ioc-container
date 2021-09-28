# CleanUseCase

Library of different use case type and implementation for Clean Architecture.


## Usage
### Action

It has handler and anyone can subscribe;

- IAction
- Action

```ts
export class AddTodo extends Action<ITodo> {
  constructor(
    private todoStore: ITodoStore,
    private todoRepository: ITodoRepository,
  ) {
    super();
  }

  protected async handle(payload: ITodo): Promise<void> {
    await this.todoRepository.addTodo(payload);
    this.todoStore.addTodo(payload);
  }
}

const addTodo = new AddTodo(new TodoStore(), new TodoRepository());
addTodo.dispatch({id: '1', title: 'Go to the GYM'});
addTodo.getAfter$().subscribe((v) => {
  console.log(v); // {id: '1', title: 'Go to the GYM'}
})
```
### Query (Getter)

Creates observable to subscribe;

- IQuery

```ts
export class GetTodoList implements IQuery<ITodo[]> {
  constructor(private todoStore: ITodoStore) {}

  create(): Observable<ITodo[]> {
    return this.todoStore.getItems();
  }
}

const getTodoList = new GetTodoList(new TodoStore());
getTodoList.create().subscribe((todoList) => console.log(todoList))
```
### Command (Setter)

To execute smth;

- ICommand

```ts
export class DeleteTodo implements ICommand {
  constructor(
    private todoStore: ITodoStore,
    private todoRepository: ITodoRepository,
  ) {}

  execute(id: string): void {
    (async () => {
      await this.todoRepository.delete(id);
      this.todoStore.deleteTodo(id); 
    })();
  }
}

const deleteTodo = new DeleteTodo();
deleteTodo.execute('2');
```

### Saga (Effect)

To observe smth and make sideEffect

- ISaga
- Saga

```ts
export class TodoNotificationSaga extends Saga {
  constructor(
    private addTodoAction: IAddTodo,
    private notificationManager: INotificatoinManager,
  ) {
    super();
  }

  protected onInit(subscriptions: Subscription[]): void {
    subscriptions.push(this.addTodoAction.getAfter$().subscribe((todo) => this.notificationManager.show(todo)));
  }
}
```