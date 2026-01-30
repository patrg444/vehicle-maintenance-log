import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('Missing Stripe publishable key');
}

export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export const SUBSCRIPTION_PRICES = {
  monthly: {
    id: 'price_1Sv7GdAr49Mk87UQeAIBunRS',
    name: 'Pro Monthly',
    price: 4.99,
    interval: 'month',
  },
  yearly: {
    id: 'price_1Sv7GiAr49Mk87UQhYvPQvIt',
    name: 'Pro Yearly',
    price: 39.99,
    interval: 'year',
    savings: '33%',
  },
} as const;

export type PriceId = keyof typeof SUBSCRIPTION_PRICES;
