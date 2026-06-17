import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import TodoItem from "../components/TodoItem";
import AddTodo from "../components/AddTodo";

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
  const { user, logout } = useAuth();

  const fetchTodos = async () => {
    try {
      const res = await api.get("/todos");
      setTodos(res.data);
    } catch (err) {
      console.error("Failed to fetch todos:", err);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleAdd = async (title: string, description: string) => {
    try {
      const res = await api.post("/todos", { title, description });
      setTodos([res.data, ...todos]);
    } catch (err) {
      console.error("Failed to add todo:", err);
    }
  };

  const handleToggle = async (id: string, is_done: boolean) => {
    try {
      const res = await api.put(`/todos/${id}`, { is_done: !is_done });
      setTodos(todos.map((t) => (t.id === id ? res.data : t)));
    } catch (err) {
      console.error("Failed to update todo:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/todos/${id}`);
      setTodos(todos.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete todo:", err);
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>My Todos</h1>
        <div className="header-right">
          <span>{user?.email}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>
      <AddTodo onAdd={handleAdd} />
      <div className="todo-list">
        {todos.length === 0 ? (
          <p className="empty">No todos yet. Add one above!</p>
        ) : (
          todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
