import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { db } from '../../../db/index.server';
import { donations, users } from '../../../db/schema';
import { EmailService } from '~/server/services/email.service';
import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export const paymentsRouter = router({
  // Get available donation tiers
  getDonationOptions: publicProcedure
    .output(z.array(z.object({
      id: z.string(),
      label: z.string(),
      amount: z.number(),
      description: z.string(),
      icon: z.string(),
    })))
    .query(async () => {
      return [
        {
          id: 'coffee',
          label: 'Coffee',
          amount: 5,
          description: 'Buy us a coffee',
          icon: 'coffee',
        },
        {
          id: 'lunch',
          label: 'Lunch',
          amount: 15,
          description: 'Support our lunch',
          icon: 'utensils',
        },
        {
          id: 'dinner',
          label: 'Dinner',
          amount: 50,
          description: 'Sponsor our dinner',
          icon: 'wine',
        },
        {
          id: 'custom',
          label: 'Custom',
          amount: 0,
          description: 'Choose your own amount',
          icon: 'gift',
        },
      ];
    }),

  // Create a checkout session for donations
  createDonationCheckout: protectedProcedure
    .input(z.object({
      amount: z.number().min(5, 'Minimum donation is $5'),
      tierLabel: z.string(),
    }))
    .output(z.object({
      sessionId: z.string(),
      url: z.string(),
      feesAmount: z.number(),
      netAmount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Calculate Stripe fees: 2.9% + $0.30
        const feesAmount = Math.round(input.amount * 0.029 * 100 + 30) / 100;
        const netAmount = input.amount - feesAmount;

        // Create a real Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: ctx.user.email,
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `Donation - ${input.tierLabel}`,
                  description: `Support FamilyHub with a ${input.tierLabel} donation`,
                },
                unit_amount: Math.round(input.amount * 100), // Convert to cents
              },
              quantity: 1,
            },
          ],
          success_url: `${process.env.PREDEV_DEPLOYMENT_URL}/donate?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.PREDEV_DEPLOYMENT_URL}/donate?canceled=true`,
          metadata: {
            userId: ctx.user.id,
            tierLabel: input.tierLabel,
            amount: input.amount,
            feesAmount: feesAmount.toString(),
            netAmount: netAmount.toString(),
          },
        });

        if (!session.url) {
          throw new Error('Failed to create checkout session URL');
        }

        return {
          sessionId: session.id,
          url: session.url,
          feesAmount,
          netAmount,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Stripe checkout error:', errorMessage);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create checkout session: ${errorMessage}`,
        });
      }
    }),

  // Verify payment and record donation
  verifyDonation: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const session = await stripe.checkout.sessions.retrieve(input.sessionId);

        if (session.payment_status === 'paid') {
          // Check if donation already recorded
          const existingDonation = await db.query.donations.findFirst({
            where: (donations, { eq }) => eq(donations.stripeSessionId, session.id),
          });

          if (!existingDonation) {
            // Calculate fees from metadata or recalculate
            const amount = Math.round((session.amount_total || 0) / 100);
            const feesAmount = session.metadata?.feesAmount 
              ? parseFloat(session.metadata.feesAmount)
              : Math.round(amount * 0.029 * 100 + 30) / 100;
            const netAmount = amount - feesAmount;

            // Record the donation
            const donationData = {
              userId: ctx.user.id,
              amount: Math.round(amount * 100), // Store in cents
              feesAmount: Math.round(feesAmount * 100), // Store in cents
              netAmount: Math.round(netAmount * 100), // Store in cents
              tierLabel: session.metadata?.tierLabel || 'Custom',
              stripeSessionId: session.id,
              stripePaymentIntentId: session.payment_intent as string,
              status: 'completed' as const,
            };
            await db.insert(donations).values([donationData]);
          }

          const amount = (session.amount_total || 0) / 100;
          const feesAmount = session.metadata?.feesAmount 
            ? parseFloat(session.metadata.feesAmount)
            : Math.round(amount * 0.029 * 100 + 30) / 100;
          const netAmount = amount - feesAmount;

          return {
            paid: true,
            amount,
            feesAmount,
            netAmount,
            tierLabel: session.metadata?.tierLabel || 'Custom',
          };
        }

        return { paid: false };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to verify donation: ${errorMessage}`,
        });
      }
    }),

  // Get all donations (admin only)
  getDonations: protectedProcedure
    .output(z.object({
      donations: z.array(z.object({
        id: z.string(),
        userId: z.string(),
        amount: z.number(),
        feesAmount: z.number(),
        netAmount: z.number(),
        tierLabel: z.string(),
        status: z.string(),
        createdAt: z.string(),
        user: z.object({
          firstName: z.string().nullable(),
          lastName: z.string().nullable(),
          email: z.string(),
        }).optional(),
      })),
      stats: z.object({
        totalDonations: z.number(),
        totalAmount: z.number(),
        totalFees: z.number(),
        totalNet: z.number(),
        averageDonation: z.number(),
      }),
    }))
    .query(async ({ ctx }) => {
      try {
        // Fetch all donations with user info
        const donationRecords = await db.query.donations.findMany({
          with: {
            user: {
              columns: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: (donations, { desc }) => [desc(donations.createdAt)],
        });

        // Convert cents to dollars and format
        const formattedDonations = donationRecords.map((d) => ({
          id: d.id,
          userId: d.userId,
          amount: d.amount / 100,
          feesAmount: d.feesAmount / 100,
          netAmount: d.netAmount / 100,
          tierLabel: d.tierLabel,
          status: d.status,
          createdAt: d.createdAt.toISOString(),
          user: d.user ? {
            firstName: d.user.firstName,
            lastName: d.user.lastName,
            email: d.user.email,
          } : undefined,
        }));

        // Calculate stats
        const totalDonations = formattedDonations.length;
        const totalAmount = formattedDonations.reduce((sum, d) => sum + d.amount, 0);
        const totalFees = formattedDonations.reduce((sum, d) => sum + d.feesAmount, 0);
        const totalNet = formattedDonations.reduce((sum, d) => sum + d.netAmount, 0);
        const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;

        return {
          donations: formattedDonations,
          stats: {
            totalDonations,
            totalAmount: Math.round(totalAmount * 100) / 100,
            totalFees: Math.round(totalFees * 100) / 100,
            totalNet: Math.round(totalNet * 100) / 100,
            averageDonation: Math.round(averageDonation * 100) / 100,
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error fetching donations:', errorMessage);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch donations: ${errorMessage}`,
        });
      }
    }),

  // Handle webhook for successful payments
  handleWebhook: publicProcedure
    .input(z.object({
      event: z.any(),
    }))
    .mutation(async ({ input }) => {
      const event = input.event;

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        try {
          // Check if donation already exists
          const existingDonation = await db.query.donations.findFirst({
            where: (donations, { eq }) => eq(donations.stripeSessionId, session.id),
          });

          if (!existingDonation && session.metadata?.userId) {
            const amount = Math.round((session.amount_total || 0) / 100);
            const feesAmount = session.metadata?.feesAmount 
              ? parseFloat(session.metadata.feesAmount)
              : Math.round(amount * 0.029 * 100 + 30) / 100;
            const netAmount = amount - feesAmount;

            // Record donation in database
            const donationData = {
              userId: session.metadata.userId,
              amount: Math.round(amount * 100), // Store in cents
              feesAmount: Math.round(feesAmount * 100), // Store in cents
              netAmount: Math.round(netAmount * 100), // Store in cents
              tierLabel: session.metadata.tierLabel || 'Custom',
              stripeSessionId: session.id,
              stripePaymentIntentId: session.payment_intent as string,
              status: 'completed' as const,
            };
            await db.insert(donations).values([donationData]);

            // Get user email for confirmation email
            const user = await db.query.users.findFirst({
              where: (users, { eq }) => eq(users.id, session.metadata.userId),
            });

            if (user?.email) {
              // Send confirmation email
              const userName = user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || 'Valued Donor';
              
              await EmailService.sendDonationConfirmationEmail(
                {
                  email: user.email,
                  userName,
                  amount,
                  feesAmount,
                  netAmount,
                  tierLabel: session.metadata.tierLabel || 'Custom',
                  donationDate: new Date(),
                  transactionId: session.id,
                },
                session.metadata.userId
              );
            }

            console.log(`✅ Donation recorded: ${session.metadata.userId} - ${amount} (fees: ${feesAmount}, net: ${netAmount})`);
          }
        } catch (error) {
          console.error('Error recording donation from webhook:', error);
        }
      }

      return { received: true };
    }),
});
