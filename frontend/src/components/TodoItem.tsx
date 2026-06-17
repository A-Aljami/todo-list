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
    <div className={`group flex items-center justify-between p-4 bg-white rounded-xl border transition-all ${
      todo.is_done
        ? "border-slate-100 opacity-60"
        : "border-slate-200 hover:border-blue-200 hover:shadow-sm"
    }`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={() => onToggle(todo.id, todo.is_done)}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            todo.is_done
              ? "bg-green-500 border-green-500"
              : "border-slate-300 hover:border-blue-500"
          }`}
        >
          {todo.is_done && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="min-w-0">
          <h3 className={`font-medium text-slate-800 break-words ${todo.is_done ? "line-through text-slate-400" : ""}`}>
            {todo.title}
          </h3>
          {todo.description && (
            <p className={`text-sm break-words mt-0.5 ${todo.is_done ? "text-slate-300" : "text-slate-500"}`}>
              {todo.description}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(todo.id)}
        className="flex-shrink-0 ml-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
