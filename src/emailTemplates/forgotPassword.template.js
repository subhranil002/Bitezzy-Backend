const forgotPasswordTemplate = ({ name, resetLink }) => {
    return `
  <div style="
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    background-color: #fff7ed; /* Very light orange/cream background */
    padding: 60px 20px;
    color: #4b5563;
  ">
    <div style="
      max-width: 500px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px 40px;
      border-radius: 1px;
      border: 1px solid #ffedd5; /* Subtle orange border */
      text-align: center;
    ">

      <h1 style="
        margin: 0 0 40px;
        color: #ea580c; /* Sophisticated deep orange */
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
      ">
        BiteBot
      </h1>

      <h2 style="
        margin: 0 0 24px;
        font-size: 28px;
        color: #1f2937;
        font-weight: 300;
        letter-spacing: -0.5px;
        line-height: 1.2;
      ">
        Reset Your Password
      </h2>

      <p style="
        font-size: 15px; 
        line-height: 1.8; 
        color: #6b7280; 
        margin-bottom: 32px;
        font-weight: 400;
      ">
        Hello <strong>${name}</strong>,<br/>
        We received a request to reset the password for your BiteBot account. 
        Click the button below to choose a new one.
      </p>

      <a href="${resetLink}" style="
        display: inline-block;
        background-color: #1f2937; /* Dark gray/black for contrast */
        color: #ffffff;
        padding: 16px 36px;
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
        border-radius: 2px;
        margin-bottom: 32px;
      ">
        Reset Password
      </a>

      <p style="
        font-size: 13px;
        color: #9ca3af;
        margin-bottom: 24px;
        line-height: 1.5;
      ">
        This link will expire in <strong>15 minutes</strong>. If you didn't ask to reset your password, you can safely ignore this email.
      </p>

      <div style="
        width: 40px; 
        height: 2px; 
        background-color: #fb923c; /* Soft orange accent */ 
        margin: 0 auto 40px;
      "></div>

      <p style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">
        Button not working? Copy and paste this link:
      </p>
      
      <p style="
        background: #f9fafb;
        padding: 12px;
        border-radius: 4px;
        font-size: 11px;
        color: #6b7280;
        word-break: break-all;
        border: 1px solid #e5e7eb;
        margin-bottom: 40px;
        font-family: monospace;
      ">
        ${resetLink}
      </p>

      <div style="margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 24px;">
        <p style="font-size: 11px; color: #9ca3af; letter-spacing: 1px; text-transform: uppercase;">
          The BiteBot Team
        </p>
      </div>

    </div>
  </div>
    `;
};

export default forgotPasswordTemplate;
