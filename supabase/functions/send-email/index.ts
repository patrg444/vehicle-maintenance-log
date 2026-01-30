import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const FROM_EMAIL = 'GetCarLog <noreply@getcarlog.com>';

interface EmailRequest {
  type: 'welcome' | 'subscription' | 'reminder';
  to: string;
  data: Record<string, unknown>;
}

const templates = {
  welcome: (data: { name?: string }) => ({
    subject: 'Welcome to Vehicle Maintenance Log! 🚗',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .feature { display: flex; align-items: center; margin: 15px 0; }
            .feature-icon { font-size: 24px; margin-right: 15px; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 Welcome${data.name ? `, ${data.name}` : ''}!</h1>
              <p>Your vehicle maintenance journey starts now</p>
            </div>
            <div class="content">
              <p>Thanks for joining Vehicle Maintenance Log! We're excited to help you keep track of your vehicle's maintenance history.</p>

              <h3>Here's what you can do:</h3>

              <div class="feature">
                <span class="feature-icon">🚙</span>
                <div>
                  <strong>Add Your Vehicles</strong>
                  <p style="margin: 5px 0; color: #6b7280;">Track maintenance for all your cars, trucks, and motorcycles</p>
                </div>
              </div>

              <div class="feature">
                <span class="feature-icon">📝</span>
                <div>
                  <strong>Log Service History</strong>
                  <p style="margin: 5px 0; color: #6b7280;">Record oil changes, repairs, and all maintenance work</p>
                </div>
              </div>

              <div class="feature">
                <span class="feature-icon">🔔</span>
                <div>
                  <strong>Set Reminders</strong>
                  <p style="margin: 5px 0; color: #6b7280;">Never miss an oil change or tire rotation again</p>
                </div>
              </div>

              <div class="feature">
                <span class="feature-icon">📊</span>
                <div>
                  <strong>Export Reports</strong>
                  <p style="margin: 5px 0; color: #6b7280;">Generate PDF or CSV reports for your records</p>
                </div>
              </div>

              <center>
                <a href="https://vehicle-maintenance-log.vercel.app" class="button">Get Started</a>
              </center>

              <p style="color: #6b7280; font-size: 14px;">Pro tip: Start by adding your first vehicle and logging your most recent service!</p>
            </div>
            <div class="footer">
              <p>Vehicle Maintenance Log</p>
              <p>Keep your vehicles running smoothly</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  subscription: (data: { name?: string; plan: string; amount: string }) => ({
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
            .feature { display: flex; align-items: center; margin: 15px 0; }
            .check { color: #10b981; font-size: 20px; margin-right: 10px; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👑 You're a Pro!</h1>
              <p>Thank you for upgrading</p>
            </div>
            <div class="content">
              <p>Hey${data.name ? ` ${data.name}` : ''}! 🎉</p>

              <p>Your <span class="pro-badge">PRO ${data.plan}</span> subscription is now active!</p>

              <p>You now have access to all premium features:</p>

              <div class="feature"><span class="check">✓</span> Unlimited vehicles</div>
              <div class="feature"><span class="check">✓</span> Unlimited service history</div>
              <div class="feature"><span class="check">✓</span> Cloud backup for receipts</div>
              <div class="feature"><span class="check">✓</span> Advanced maintenance reminders</div>
              <div class="feature"><span class="check">✓</span> Export to PDF & CSV</div>
              <div class="feature"><span class="check">✓</span> Priority support</div>

              <p style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <strong>Billing:</strong> ${data.amount} will be charged ${data.plan === 'yearly' ? 'annually' : 'monthly'}. You can manage your subscription anytime from your account settings.
              </p>

              <p>Thanks for supporting Vehicle Maintenance Log! If you have any questions, just reply to this email.</p>
            </div>
            <div class="footer">
              <p>Vehicle Maintenance Log</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  reminder: (data: { name?: string; vehicleName: string; reminderTitle: string; dueInfo: string }) => ({
    subject: `🔔 Maintenance Due: ${data.reminderTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Maintenance Reminder</h1>
              <p>${data.vehicleName}</p>
            </div>
            <div class="content">
              <p>Hey${data.name ? ` ${data.name}` : ''}!</p>

              <div class="alert-box">
                <h3 style="margin-top: 0; color: #dc2626;">⚠️ ${data.reminderTitle}</h3>
                <p style="margin-bottom: 0;"><strong>Due:</strong> ${data.dueInfo}</p>
              </div>

              <p>It's time to schedule maintenance for your <strong>${data.vehicleName}</strong>.</p>

              <p>Regular maintenance helps:</p>
              <ul>
                <li>Extend your vehicle's lifespan</li>
                <li>Improve fuel efficiency</li>
                <li>Prevent costly repairs</li>
                <li>Maintain resale value</li>
              </ul>

              <center>
                <a href="https://vehicle-maintenance-log.vercel.app" class="button">View Reminder</a>
              </center>
            </div>
            <div class="footer">
              <p>Vehicle Maintenance Log</p>
              <p style="font-size: 12px;">You're receiving this because you have reminders enabled.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { type, to, data } = await req.json() as EmailRequest;

    if (!type || !to) {
      throw new Error('Missing required fields: type, to');
    }

    const template = templates[type];
    if (!template) {
      throw new Error(`Unknown email type: ${type}`);
    }

    const { subject, html } = template(data as any);

    const { data: emailData, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, id: emailData?.id }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Email error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
