interface Todo {
  id: string;
  title: string;
  description: string | null;
  is_done: boolean;
  priority: number;
  due_date: string | null;
  created_at: string;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, is_done: boolean) => void;
  onDelete: (id: string) => void;
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <div className={`todo-item ${todo.is_done ? "done" : ""}`}>
      <div className="todo-content">
        <input
          type="checkbox"
          checked={todo.is_done}
          onChange={() => onToggle(todo.id, todo.is_done)}
        />
        <div>
          <h3>{todo.title}</h3>
          {todo.description && <p>{todo.description}</p>}
        </div>
      </div>
      <button onClick={() => onDelete(todo.id)} className="delete-btn">Delete</button>
    </div>
  );
}
