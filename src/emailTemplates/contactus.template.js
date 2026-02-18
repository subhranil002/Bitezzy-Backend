const contactUsTemplate = ({ name, email, message }) => {
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
      box-shadow: 0 4px 20px rgba(0,0,0,0.03); 
    ">

      <div style="border-bottom: 2px solid #fb923c; padding-bottom: 24px; margin-bottom: 32px;">
        <h1 style="
          margin: 0;
          color: #ea580c; /* Sophisticated deep orange */
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
        ">
          BiteBot Admin
        </h1>
        <h2 style="
          margin: 12px 0 0;
          font-size: 24px;
          color: #1f2937;
          font-weight: 300;
        ">
          New Contact Submission
        </h2>
      </div>

      <div style="margin-bottom: 32px;">
        <p style="margin: 0 0 8px; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
          From
        </p>
        <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 500;">
          ${name}
        </p>
        <a href="mailto:${email}" style="display: block; margin-top: 4px; font-size: 14px; color: #ea580c; text-decoration: none;">
          ${email}
        </a>
      </div>

      <div>
        <p style="margin: 0 0 12px; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
          Message
        </p>
        <div style="
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 20px;
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
          white-space: pre-line;
        ">
          ${message}
        </div>
      </div>

      <div style="margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 24px;">
        <p style="font-size: 11px; color: #9ca3af; margin: 0;">
          Received via BiteBot Contact Form • ${new Date().toLocaleDateString()}
        </p>
      </div>

    </div>
  </div>
  `;
};

export default contactUsTemplate;
