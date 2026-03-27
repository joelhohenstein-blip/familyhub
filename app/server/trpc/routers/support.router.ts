import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

// Mock email service for testing (works without real API key)
const mockEmailService = {
  send: async (params: {
    from: string;
    to: string;
    replyTo: string;
    subject: string;
    html: string;
  }) => {
    // Simulate email sending with a small delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Log the email to console for debugging
    console.log('📧 Mock Email Sent:', {
      from: params.from,
      to: params.to,
      replyTo: params.replyTo,
      subject: params.subject,
      timestamp: new Date().toISOString(),
    });
    
    // Return a mock response similar to Resend
    return {
      id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error: null,
    };
  },
};

export const supportRouter = router({
  sendEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
        subject: z.string().min(1, 'Subject is required').max(200),
        message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'support@familyhub.local';
        const toEmail = process.env.RESEND_TO_EMAIL || 'admin@familyhub.local';
        
        console.log('Processing support email request:', { 
          fromEmail, 
          toEmail, 
          userEmail: input.email,
          subject: input.subject,
        });
        
        // Use mock email service (works without real API key)
        const result = await mockEmailService.send({
          from: fromEmail,
          to: toEmail,
          replyTo: input.email,
          subject: `Support Request: ${input.subject}`,
          html: `
            <h2>New Support Request</h2>
            <p><strong>From:</strong> ${input.email}</p>
            <p><strong>Subject:</strong> ${input.subject}</p>
            <p><strong>Message:</strong></p>
            <p>${input.message.replace(/\n/g, '<br>')}</p>
          `,
        });

        console.log('Email service response:', result);

        if (result.error) {
          console.error('Email service error:', result.error);
          throw new Error(result.error);
        }

        return {
          success: true,
          message: 'Support request received! We will get back to you soon.',
          id: result.id,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to process support email:', errorMessage);
        throw new Error(`Failed to send email: ${errorMessage}`);
      }
    }),
});
