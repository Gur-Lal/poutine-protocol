import Stripe from 'stripe';

// Initialize Stripe with test key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

export interface PaymentSessionData {
  amount: number;
  currency: string;
  tripId: string;
  email: string;
  description: string;
}

export class StripePaymentService {
  // Create a Stripe Checkout Session for trip payment
  async createCheckoutSession(data: PaymentSessionData): Promise<string> {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: data.currency,
              product_data: {
                name: 'Bike Rental Trip',
                description: data.description,
              },
              unit_amount: Math.round(data.amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?payment=success&trip=${data.tripId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?payment=cancelled`,
        customer_email: data.email,
        metadata: {
          tripId: data.tripId,
          email: data.email,
        },
      });

      return session.url || '';
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      throw new Error('Failed to create payment session');
    }
  }

  // Retrieve a Stripe Checkout Session by ID
  async getSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      console.error('Error retrieving Stripe session:', error);
      throw new Error('Failed to retrieve payment session');
    }
  }

  // Create a PaymentIntent
  async createPaymentIntent(data: PaymentSessionData): Promise<string> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency,
        description: data.description,
        metadata: {
          tripId: data.tripId,
          email: data.email,
        },
      });

      return paymentIntent.client_secret || '';
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }
}