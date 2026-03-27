import React, { useState } from 'react';
import { trpc } from '../utils/trpc';
import { createTodoSchema } from '../server/trpc/routers/todo.router';
import { z } from 'zod';
import type { Todo } from '../db/schema';

export default function TodoComponent() {
  const [newTodo, setNewTodo] = useState<z.infer<typeof createTodoSchema>>({
    title: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Use React Query hooks properly
  const { 
    data: todos = [], 
    isLoading: loading, 
    refetch: refetchTodos 
  } = trpc.todo.getAll.useQuery();

  // Create mutation
  const createMutation = trpc.todo.create.useMutation({
    onSuccess: () => {
      setNewTodo({ title: '', description: '' });
      refetchTodos(); // Refetch the list
    },
    onError: (err) => {
      setError('Failed to create todo');
      console.error(err);
    }
  });

  // Toggle mutation
  const toggleMutation = trpc.todo.toggleComplete.useMutation({
    onSuccess: () => {
      refetchTodos(); // Refetch the list
    },
    onError: (err) => {
      setError('Failed to update todo');
      console.error(err);
    }
  });

  // Delete mutation
  const deleteMutation = trpc.todo.delete.useMutation({
    onSuccess: () => {
      refetchTodos(); // Refetch the list
    },
    onError: (err) => {
      setError('Failed to delete todo');
      console.error(err);
    }
  });

  // Handle form submission to create a new todo
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate with Zod schema before sending
      createTodoSchema.parse(newTodo);
      
      createMutation.mutate(newTodo);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues.map((e: { message: string }) => e.message).join(', '));
      } else {
        setError('Failed to create todo');
        console.error(err);
      }
    }
  };

  // Toggle todo completion status
  const toggleTodo = async (id: string) => {
    toggleMutation.mutate({ id });
  };

  // Delete a todo
  const deleteTodo = async (id: string) => {
    deleteMutation.mutate({ id });
  };

  if (loading) return <div>Loading...</div>;

  // Convert string dates to Date objects for display
  const formattedTodos = todos.map(todo => ({
    ...todo,
    createdAt: new Date(todo.createdAt),
    updatedAt: new Date(todo.updatedAt)
  }));

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Todo List</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button 
            className="float-right" 
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={newTodo.title}
            onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="Enter todo title"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Description (optional)</label>
          <textarea
            value={newTodo.description || ''}
            onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="Enter description"
          />
        </div>
        
        <button 
          type="submit" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={createMutation.isLoading}
        >
          {createMutation.isLoading ? 'Creating...' : 'Add Todo'}
        </button>
      </form>
      
      <ul className="space-y-4">
        {formattedTodos.map((todo) => (
          <li 
            key={todo.id} 
            className="border p-4 rounded flex justify-between items-center"
          >
            <div>
              <div 
                className={`text-lg font-semibold ${todo.completed ? 'line-through text-gray-500' : ''}`}
              >
                {todo.title}
              </div>
              {todo.description && (
                <p className="text-gray-600">{todo.description}</p>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`px-3 py-1 rounded ${
                  todo.completed 
                    ? 'bg-yellow-500 hover:bg-yellow-600' 
                    : 'bg-green-500 hover:bg-green-600'
                } text-white`}
                disabled={toggleMutation.isLoading}
              >
                {todo.completed ? 'Undo' : 'Complete'}
              </button>
              
              <button
                onClick={() => deleteTodo(todo.id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                disabled={deleteMutation.isLoading}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        
        {formattedTodos.length === 0 && (
          <p className="text-gray-500 italic">No todos yet. Add one above!</p>
        )}
      </ul>
    </div>
  );
} 