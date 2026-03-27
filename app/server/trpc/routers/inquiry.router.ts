import { z } from 'zod';
import { router, adminProcedure } from '../trpc';
import { inquiryForms } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// Validation schemas
export const createInquiryFormSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  mediaType: z.string().min(1, 'Media type is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  customerEmail: z.string().email('Invalid email address'),
  notes: z.string().optional(),
});

export const updateInquiryFormSchema = z.object({
  formId: z.string().uuid('Invalid form ID'),
  mediaType: z.string().min(1, 'Media type is required').optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').optional(),
  customerEmail: z.string().email('Invalid email address').optional(),
  notes: z.string().optional(),
});

export const inquiryRouter = router({
  // Get all inquiry forms for an order
  getInquiryForms: adminProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const forms = await ctx.db
        .select()
        .from(inquiryForms)
        .where(eq(inquiryForms.orderId, input.orderId))
        .orderBy(inquiryForms.createdAt);

      return { forms };
    }),

  // Get a single inquiry form
  getInquiryForm: adminProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [form] = await ctx.db
        .select()
        .from(inquiryForms)
        .where(eq(inquiryForms.id, input.formId))
        .limit(1);

      return form || null;
    }),

  // Create a new inquiry form
  createInquiryForm: adminProcedure
    .input(createInquiryFormSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate required fields
      if (!input.mediaType.trim()) {
        throw new Error('Media type is required');
      }
      if (!input.customerEmail.trim()) {
        throw new Error('Customer email is required');
      }
      if (input.quantity < 1) {
        throw new Error('Quantity must be at least 1');
      }

      const [newForm] = await ctx.db
        .insert(inquiryForms)
        .values({
          orderId: input.orderId,
          mediaType: input.mediaType,
          quantity: input.quantity,
          customerEmail: input.customerEmail,
          notes: input.notes || null,
          status: 'submitted',
        })
        .returning();

      return newForm;
    }),

  // Update an inquiry form
  updateInquiryForm: adminProcedure
    .input(updateInquiryFormSchema)
    .mutation(async ({ ctx, input }) => {
      const { formId, ...updateData } = input;

      // Validate required fields if provided
      if (updateData.mediaType !== undefined && !updateData.mediaType.trim()) {
        throw new Error('Media type cannot be empty');
      }
      if (updateData.customerEmail !== undefined && !updateData.customerEmail.trim()) {
        throw new Error('Customer email cannot be empty');
      }
      if (updateData.quantity !== undefined && updateData.quantity < 1) {
        throw new Error('Quantity must be at least 1');
      }

      const [updatedForm] = await ctx.db
        .update(inquiryForms)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(inquiryForms.id, formId))
        .returning();

      if (!updatedForm) {
        throw new Error('Inquiry form not found');
      }

      return updatedForm;
    }),

  // Delete an inquiry form
  deleteInquiryForm: adminProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedForm] = await ctx.db
        .delete(inquiryForms)
        .where(eq(inquiryForms.id, input.formId))
        .returning();

      if (!deletedForm) {
        throw new Error('Inquiry form not found');
      }

      return deletedForm;
    }),

  // Update inquiry form status
  updateInquiryFormStatus: adminProcedure
    .input(z.object({
      formId: z.string().uuid(),
      status: z.enum(['submitted', 'under_review', 'approved', 'rejected', 'completed']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch current form to validate transition
      const [currentForm] = await ctx.db
        .select()
        .from(inquiryForms)
        .where(eq(inquiryForms.id, input.formId))
        .limit(1);

      if (!currentForm) {
        throw new Error('Inquiry form not found');
      }

      // Define valid state transitions
      const validTransitions: Record<string, string[]> = {
        submitted: ['under_review', 'rejected'],
        under_review: ['approved', 'rejected'],
        approved: ['completed'],
        rejected: [],
        completed: [],
      };

      // Check if transition is valid
      const allowedNextStates = validTransitions[currentForm.status] || [];
      if (!allowedNextStates.includes(input.status)) {
        throw new Error(
          `Invalid status transition from '${currentForm.status}' to '${input.status}'. ` +
          `Allowed transitions: ${allowedNextStates.length > 0 ? allowedNextStates.join(', ') : 'none'}`
        );
      }

      // Update with timestamp
      const [updatedForm] = await ctx.db
        .update(inquiryForms)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(inquiryForms.id, input.formId))
        .returning();

      return updatedForm;
    }),
});
