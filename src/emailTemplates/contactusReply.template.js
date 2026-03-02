const contactUsAutoReplyTemplate = ({ name }) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>BiteBot – We’ve received your message</title>
    </head>
    <body style="margin:0;padding:0;background-color:#fff7ed; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 60px 20px;">
        <tr>
          <td align="center">
            <table width="100%" style="max-width: 500px; background: #ffffff; padding: 48px 40px; border: 1px solid #ffedd5; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border-radius: 1px;" cellpadding="0" cellspacing="0">
              
              <tr>
                <td style="border-bottom: 2px solid #fb923c; padding-bottom: 24px; margin-bottom: 32px;">
                  <h1 style="margin: 0; color: #ea580c; font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                    BiteBot 
                  </h1>
                  <h2 style="margin: 12px 0 0; font-size: 24px; color: #1f2937; font-weight: 300;">
                    Hi ${name} 
                  </h2>
                </td>
              </tr>

              <tr>
                <td style="padding-top: 32px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  <p style="margin: 0 0 16px;">
                    Thanks for reaching out to <strong>BiteBot</strong>! We’ve received your message and our team is currently reviewing it.
                  </p>
                  
                  <p style="margin: 0 0 16px;">
                    One of our support members will get back to you as soon as possible. We always aim to respond within <strong>24–48 hours</strong>.
                  </p>

                  <p style="margin: 0 0 16px;">
                    In the meantime, feel free to explore BiteBot and discover smarter, happier food choices 
                  </p>

                  <p style="margin-top: 32px; color: #1f2937; font-weight: 500;">
                    Warm regards,<br />
                    <span style="color: #ea580c;">The BiteBot Team</span>
                  </p>
                </td>
              </tr>

              <tr>
                <td style="margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 24px;">
                  <p style="font-size: 11px; color: #9ca3af; margin: 0; line-height: 1.4;">
                    This is an automated confirmation. No need to reply to this address.<br />
                    © ${new Date().getFullYear()} BiteBot. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

export default contactUsAutoReplyTemplate;
