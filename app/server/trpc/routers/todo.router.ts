import { z } from 'zod';
import { router, procedure } from '../trpc';
import { todos, Todo } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// Define Zod schemas for Todo validation
export const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

export const updateTodoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
});

export const todoRouter = router({
  getAll: procedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(todos).orderBy(todos.createdAt);
  }),
  
  getById: procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.select()
        .from(todos)
        .where(eq(todos.id, input.id))
        .limit(1);
      return results[0] || null;
    }),
  
  create: procedure
    .input(createTodoSchema)
    .mutation(async ({ ctx, input }) => {
      const [newTodo] = await ctx.db.insert(todos)
        .values({
          title: input.title,
          description: input.description || null,
          completed: false,
        })
        .returning();
      return newTodo;
    }),
  
  update: procedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1, 'Title is required').optional(),
      description: z.string().optional(),
      completed: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updatedTodo] = await ctx.db.update(todos)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(todos.id, id))
        .returning();
      return updatedTodo;
    }),
  
  delete: procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Delete procedure received ID:", input.id);
        const [deletedTodo] = await ctx.db.delete(todos)
          .where(eq(todos.id, input.id))
          .returning();
        
        if (!deletedTodo) {
          throw new Error(`Todo with ID ${input.id} not found`);
        }
        return deletedTodo;
      } catch (error) {
        console.error("Database delete error:", error);
        throw error;
      }
    }),
  
  toggleComplete: procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log("Toggle complete procedure called with ID:", input.id);
      
      try {
        // First get the current state
        const [todo] = await ctx.db.select()
          .from(todos)
          .where(eq(todos.id, input.id))
          .limit(1);
        
        if (!todo) {
          console.log("Todo not found for toggle:", input.id);
          throw new Error('Todo not found');
        }
        
        console.log("Current completion state:", todo.completed);
        
        // Then update it
        const [updatedTodo] = await ctx.db.update(todos)
          .set({
            completed: !todo.completed,
            updatedAt: new Date(),
          })
          .where(eq(todos.id, input.id))
          .returning();
        
        console.log("Toggle complete success, new state:", updatedTodo.completed);
        
        return updatedTodo;
      } catch (error) {
        console.error("Toggle error:", error);
        throw error;
      }
    }),
}); 