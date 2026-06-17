import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/axios";
import TodoItem from "../components/TodoItem";
import AddTodo from "../components/AddTodo";
import { AxiosError } from "axios";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  is_done: boolean;
  priority: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export default function Dashboard() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    let ignore = false;
    api.get("/todos").then((res) => {
      if (!ignore) setTodos(res.data);
    }).catch((err) => {
      if (!ignore && err instanceof AxiosError) {
        setError(err.response?.data?.error || "Failed to load todos");
      }
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, []);

  const handleAdd = async (title: string, description: string) => {
    setError("");
    try {
      const res = await api.post("/todos", { title, description });
      setTodos([res.data, ...todos]);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.error || "Failed to add todo");
      }
    }
  };

  const handleToggle = async (id: string, is_done: boolean) => {
    setError("");
    try {
      const res = await api.put(`/todos/${id}`, { is_done: !is_done });
      setTodos(todos.map((t) => (t.id === id ? res.data : t)));
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.error || "Failed to update todo");
      }
    }
  };

  const handleEdit = async (id: string, title: string, description: string) => {
    setError("");
    try {
      const res = await api.put(`/todos/${id}`, { title, description });
      setTodos(todos.map((t) => (t.id === id ? res.data : t)));
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.error || "Failed to update todo");
      }
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      await api.delete(`/todos/${id}`);
      setTodos(todos.filter((t) => t.id !== id));
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.error || "Failed to delete todo");
      }
    }
  };

  const completedCount = todos.filter((t) => t.is_done).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800">My Todos</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-500 text-sm hidden sm:block">{user?.email}</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {todos.length > 0 && (
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-medium text-slate-800">{todos.length}</span> tasks
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-medium text-green-600">{completedCount}</span> completed
            </div>
            {todos.length > 0 && (
              <>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[120px]">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(completedCount / todos.length) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <AddTodo onAdd={handleAdd} />

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4 animate-pulse">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-400 font-medium">Loading your tasks...</p>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">No tasks yet</p>
              <p className="text-slate-400 text-sm mt-1">Add your first task above to get started</p>
            </div>
          ) : (
            todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
