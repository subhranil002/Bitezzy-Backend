const welcomeTemplate = ({ name }) => {
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
      border-radius: 1px; /* Sharper corners for minimalism */
      border: 1px solid #ffedd5; /* Subtle orange border */
      text-align: center;
    ">

      <h1 style="
        margin: 0 0 40px;
        color: #ea580c; /* Sophisticated deep orange */
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
      ">
        BiteBot
      </h1>

      <h2 style="
        margin: 0 0 16px;
        font-size: 28px;
        color: #1f2937; /* Nearly black */
        font-weight: 300; /* Light weight for elegance */
        letter-spacing: -0.5px;
      ">
        Welcome to bitebot, ${name}.
      </h2>

      <p style="
        font-size: 15px; 
        line-height: 1.8; 
        color: #6b7280; 
        margin-bottom: 32px;
        font-weight: 400;
      ">
        We are thrilled to have you here. BiteBot is designed to make every meal a moment to savor. Discover curated recipes, track your nutrition, and find your next favorite dish with ease.
      </p>

      <div style="
        width: 40px; 
        height: 2px; 
        background-color: #fb923c; /* Soft orange accent */ 
        margin: 0 auto 40px;
      "></div>

      <a href="#" style="
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
      ">
        Start Exploring
      </a>

      <div style="margin-top: 60px; border-top: 1px solid #f3f4f6; padding-top: 24px;">
        <p style="font-size: 12px; color: #9ca3af; letter-spacing: 0.5px;">
          THE BITEBOT TEAM
        </p>
      </div>

    </div>
  </div>
    `;
};

export default welcomeTemplate;
