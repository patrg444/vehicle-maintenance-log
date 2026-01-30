import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string;
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

async function sendSubscriptionEmail(email: string, name: string | null, plan: string, amount: string) {
  try {
    await resend.emails.send({
      from: 'GetCarLog <noreply@getcarlog.com>',
      to: email,
      subject: 'Welcome to Pro! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b, #f97316); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
              .pro-badge { display: inline-block; background: linear-gradient(135deg, #f59e0b, #f97316); color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
              .feature { margin: 10px 0; }
              .check { color: #10b981; margin-right: 8px; }
              .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>👑 You're a Pro!</h1>
              </div>
              <div class="content">
                <p>Hey${name ? ` ${name}` : ''}! 🎉</p>
                <p>Your <span class="pro-badge">PRO</span> subscription is now active!</p>
                <p>You now have access to:</p>
                <div class="feature"><span class="check">✓</span> Unlimited vehicles</div>
                <div class="feature"><span class="check">✓</span> Cloud backup for receipts</div>
                <div class="feature"><span class="check">✓</span> Advanced reminders</div>
                <div class="feature"><span class="check">✓</span> PDF & CSV export</div>
                <p style="background: #ecfdf5; padding: 15px; border-radius: 8px;">
                  <strong>Billing:</strong> ${amount} charged ${plan}
                </p>
              </div>
              <div class="footer">
                <p>Vehicle Maintenance Log</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (e) {
    console.error('Failed to send subscription email:', e);
  }
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscription = session.subscription
          ? await stripe.subscriptions.retrieve(session.subscription as string)
          : null;
        const userId = subscription?.metadata.supabase_user_id || session.metadata?.supabase_user_id;

        if (userId) {
          // Update subscription status
          await supabase
            .from('profiles')
            .update({ subscription_status: 'pro' })
            .eq('id', userId);

          // Get user info and send email
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', userId)
            .single();

          if (profile?.email && subscription) {
            const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);
            const plan = price.recurring?.interval === 'year' ? 'yearly' : 'monthly';
            const amount = `$${((price.unit_amount || 0) / 100).toFixed(2)}`;
            await sendSubscriptionEmail(profile.email, profile.full_name, plan, amount);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.supabase_user_id;

        if (userId) {
          const status = subscription.status === 'active' ? 'pro' : 'free';
          await supabase
            .from('profiles')
            .update({ subscription_status: status })
            .eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.supabase_user_id;

        if (userId) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'cancelled' })
            .eq('id', userId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'free' })
            .eq('id', profile.id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
