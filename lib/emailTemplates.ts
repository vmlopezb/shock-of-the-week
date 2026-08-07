export function challengeReminderEmail(challengeTitle: string, siteUrl: string) {
  const dashboardUrl = `${siteUrl}/dashboard`;

  return {
    subject: `🫀 New challenge: ${challengeTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
        <h1 style="font-size: 20px; margin-bottom: 4px;">❤️ Shock of the Week</h1>
        <p style="color: #6b7280; margin-top: 0;">A new challenge just went live.</p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="font-weight: 600; font-size: 16px; margin: 0;">${challengeTitle}</p>
        </div>
        <a href="${dashboardUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Solve it now →
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
          You're receiving this because you have an account on Shock of the Week.
        </p>
      </div>
    `,
  };
}
