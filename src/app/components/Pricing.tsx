import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { SUBSCRIPTION_PRICES, PriceId } from '@/lib/stripe';
import { Check, Crown, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const PRO_FEATURES = [
  'Unlimited vehicles',
  'Unlimited service history',
  'Receipt storage (cloud backup)',
  'Advanced reminders',
  'Export to PDF & CSV',
  'Priority support',
];

const FREE_FEATURES = [
  'Up to 2 vehicles',
  'Basic service tracking',
  'Local storage only',
  'Basic reminders',
];

export function Pricing() {
  const { user, isPro, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PriceId>('yearly');

  const handleSubscribe = async (priceId: PriceId) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    setLoading(true);
    try {
      // Call Supabase Edge Function to create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: SUBSCRIPTION_PRICES[priceId].id,
          successUrl: `${window.location.origin}/?success=true`,
          cancelUrl: `${window.location.origin}/?canceled=true`,
        },
      });

      if (error) throw error;

      // Redirect to Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          returnUrl: window.location.origin,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open subscription portal.');
    } finally {
      setLoading(false);
    }
  };

  if (isPro) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-full">
                <Crown className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">You're a Pro!</CardTitle>
            <CardDescription>
              Thank you for supporting Vehicle Maintenance Log
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              You have access to all Pro features. Enjoy unlimited vehicles, cloud backup, and more.
            </p>
            <Button variant="outline" onClick={handleManageSubscription} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Manage Subscription'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Upgrade to Pro</h2>
        <p className="text-gray-600 mt-2">
          Unlock all features and support the development
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Free
              <Badge variant="secondary">Current</Badge>
            </CardTitle>
            <CardDescription>Basic vehicle maintenance tracking</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-gray-500">/forever</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="border-2 border-blue-500 relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-blue-500">
              <Sparkles className="w-3 h-3 mr-1" />
              Most Popular
            </Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Pro
            </CardTitle>
            <CardDescription>Everything you need for serious maintenance tracking</CardDescription>

            {/* Plan Toggle */}
            <div className="flex gap-2 mt-4">
              <Button
                variant={selectedPlan === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPlan('monthly')}
              >
                Monthly
              </Button>
              <Button
                variant={selectedPlan === 'yearly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPlan('yearly')}
              >
                Yearly
                <Badge variant="secondary" className="ml-2">
                  Save {SUBSCRIPTION_PRICES.yearly.savings}
                </Badge>
              </Button>
            </div>

            <div className="mt-4">
              <span className="text-4xl font-bold">
                ${SUBSCRIPTION_PRICES[selectedPlan].price}
              </span>
              <span className="text-gray-500">
                /{SUBSCRIPTION_PRICES[selectedPlan].interval}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              size="lg"
              onClick={() => handleSubscribe(selectedPlan)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </>
              )}
            </Button>
            <p className="text-xs text-center text-gray-500">
              Cancel anytime. No questions asked.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
