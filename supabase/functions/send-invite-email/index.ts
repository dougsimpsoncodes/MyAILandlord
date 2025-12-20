import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface InviteEmailRequest {
  recipientEmail: string;
  recipientName?: string;
  propertyName: string;
  inviteUrl: string;
  landlordName?: string;
}

serve(async (req) => {
  // Handle CORS preflight
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
    // Parse request body
    const { recipientEmail, recipientName, propertyName, inviteUrl, landlordName }: InviteEmailRequest = await req.json();

    // Validate required fields
    if (!recipientEmail || !propertyName || !inviteUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: recipientEmail, propertyName, inviteUrl' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build email content
    const fromName = landlordName || 'MyAI Landlord';
    const subject = `Invitation to ${propertyName}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #4F46E5; }
            .content { padding: 30px 0; }
            .button { display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
            .property-name { font-size: 20px; font-weight: 700; color: #4F46E5; margin: 10px 0; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: #4F46E5;">🏠 MyAI Landlord</h1>
            </div>

            <div class="content">
              <p>Hi${recipientName ? ` ${recipientName}` : ''}!</p>

              <p>You're invited to connect to your rental property using the MyAI Landlord app.</p>

              <p class="property-name">📍 ${propertyName}</p>

              <p><strong>Click the button below to get started:</strong></p>

              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </div>

              <p style="font-size: 14px; color: #6b7280;">
                Or copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #4F46E5; word-break: break-all;">${inviteUrl}</a>
              </p>

              <p>This link will automatically connect you to your rental property so you can:</p>
              <ul>
                <li>Report maintenance issues</li>
                <li>Communicate with your landlord</li>
                <li>Access property information</li>
              </ul>

              <p>Best regards,<br>${fromName}</p>
            </div>

            <div class="footer">
              <p>This invitation was sent by ${fromName} via MyAI Landlord</p>
              <p style="font-size: 12px; margin-top: 10px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Hi${recipientName ? ` ${recipientName}` : ''}!

You're invited to connect to your rental property using the MyAI Landlord app.

Property: ${propertyName}

Click this link to get started:
${inviteUrl}

This link will automatically connect you to your rental property so you can:
• Report maintenance issues
• Communicate with your landlord
• Access property information

Best regards,
${fromName}

---
This invitation was sent by ${fromName} via MyAI Landlord
If you didn't expect this invitation, you can safely ignore this email.
    `.trim();

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MyAI Landlord <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: subject,
        html: htmlContent,
        text: textContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', response.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          details: response.status === 403 ? 'Resend API key may be invalid' : 'Email service error'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    console.log(`Email sent successfully to ${recipientEmail} for property ${propertyName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email sent successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Error in send-invite-email function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});
