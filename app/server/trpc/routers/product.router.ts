import { z } from 'zod';
import { router, procedure } from '../trpc';
import { products } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// Zod schemas for validation
const productIdSchema = z.object({
  productId: z.string().uuid()
});

const trackARViewSchema = z.object({
  productId: z.string().uuid()
});

export const productRouter = router({
  // Get all products for ProductsPageProps
  getProductsPageProps: procedure
    .query(async ({ ctx }) => {
      const allProducts = await ctx.db.select().from(products);
      return {
        products: allProducts
      };
    }),

  // Get single product for ProductCardProps
  getProductCardProps: procedure
    .input(productIdSchema)
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.select()
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);
      
      if (!product[0]) {
        throw new Error('Product not found');
      }
      
      return {
        product: product[0]
        // onViewAR will be handled client-side
      };
    }),

  // Get product for ARViewModalProps
  getARViewModalProps: procedure
    .input(productIdSchema)
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.select()
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);
      
      if (!product[0]) {
        throw new Error('Product not found');
      }
      
      return {
        product: product[0],
        isOpen: false, // Client-side state
        // onClose will be handled client-side
      };
    }),

  // Get AR instructions props
  getARInstructionsProps: procedure
    .query(async ({ ctx }) => {
      // Could include user preferences, dismissed state, etc.
      return {
        // onDismiss will be handled client-side
      };
    }),

  // Track AR view interaction (from onViewARFn)
  trackARView: procedure
    .input(trackARViewSchema)
    .mutation(async ({ ctx, input }) => {
      // Log AR view interaction
      console.log('AR view tracked for product:', input.productId);
      
      // Could save to analytics table in the future
      // await ctx.db.insert(analyticsEvents).values({
      //   eventType: 'ar_view',
      //   productId: input.productId,
      //   timestamp: new Date()
      // });
      
      return { success: true };
    }),

  // Handle AR dismissal (from onDismissFn)
  handleARDismiss: procedure
    .input(trackARViewSchema)
    .mutation(async ({ ctx, input }) => {
      console.log('AR instructions dismissed for product:', input.productId);
      
      // Could save user preference to not show instructions again
      return { success: true };
    }),
}); 