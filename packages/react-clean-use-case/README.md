# React adapters for clean use cases

```tsx
import React, { FunctionComponent } from 'react';
import { Each, useObservables } from 'reactivex-react';
import {
  DeleteTodo,
  FilterTodoList,
  getRandomString,
  GetTodoFilters,
  GetTodoList,
  IAddTodo,
  IAddTodoActionKey,
  repeat,
  TodoNotificationSaga,
} from '../../../../application';
import { useAction, useCommand, useQuery, useSaga } from 'react-clean-use-case';
import { Button, Panel } from 'web/ui';

export const TodoList: FunctionComponent = () => {
  useSaga(TodoNotificationSaga);
  const filterTodos = useCommand(FilterTodoList);
  const filter$ = useQuery(GetTodoFilters, (q) => q.create());
  const todoList$ = useQuery(GetTodoList, (m) => m.create());
  const addTodo = useAction<IAddTodo>(IAddTodoActionKey);
  const deleteTodo = useCommand(DeleteTodo);
  const $ = useObservables();

  return (
    <Panel>
      <Button
        onClick={() =>
          addTodo.dispatch({
            id: getRandomString(10),
            title: 'Hey',
            message: 'Hou',
            priority: Math.round((Math.random() * 10) % 5),
          })
        }
      >
        Add
      </Button>
      <select
        defaultValue={$(filter$)!.minPriority}
        onChange={({ target }) => filterTodos.execute({ minPriority: parseInt(target.value) })}
      >
        {repeat(6).map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>
      <select
        defaultValue={$(filter$)!.maxPriority}
        onChange={({ target }) => filterTodos.execute({ maxPriority: parseInt(target.value) })}
      >
        {repeat(6).map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>
      <ul>
        <Each obs$={todoList$}>
          {({ id, title, message, priority }) => (
            <li key={id}>
              {title} - {message} - {priority}
              <button className="btn btn-danger" onClick={() => deleteTodo.execute(id)}>
                Delete
              </button>
            </li>
          )}
        </Each>
      </ul>
    </Panel>
  );
};

```