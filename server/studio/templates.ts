/**
 * Branded transactional email templates. Dark navy + SwiftPilot blue,
 * matching the landing identity. Used by auth (welcome/invite) and the
 * onboarding completion flow.
 */

const shell = (title: string, body: string) => `<!doctype html><html><body style="margin:0;padding:0;background:#0c1322;font-family:'DM Sans',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="text-align:center;padding-bottom:20px">
      <div style="display:inline-block;background:#1d84f5;color:#fff;font-weight:800;font-size:14px;letter-spacing:.06em;padding:8px 16px;border-radius:10px">SwiftPilot</div>
    </div>
    <div style="background:#111a2c;border:1px solid #1e293b;border-radius:18px;padding:32px;color:#e8edf4">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-.02em">${title}</h1>
      ${body}
    </div>
    <p style="text-align:center;color:#5b6b80;font-size:11px;margin-top:18px">SwiftPilot Social Studio · manual publishing only · review every AI draft</p>
  </div></body></html>`;

const para = (text: string) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#aeb9c8">${text}</p>`;
const cta = (label: string, href: string) => `<div style="text-align:center;margin:22px 0 6px"><a href="${href}" style="display:inline-block;background:#1d84f5;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 22px;border-radius:10px">${label}</a></div>`;

export function welcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: 'Welcome to SwiftPilot Social Studio',
    html: shell('Your autopilot studio is ready', [
      para(`Hi ${name || 'there'},`),
      para('Your workspace is set up. Import a website, confirm the brand kit, and generate your first content plan — everything stays reviewable before it goes live.'),
      cta('Open the studio', process.env.APP_URL ?? '/studio'),
    ].join('')),
  };
}

export function planReadyEmail(project: string, posts: number): { subject: string; html: string } {
  return {
    subject: `Your ${project} plan is ready`,
    html: shell(`${project} — plan ready`, [
      para(`<strong>${posts} posts</strong> are queued in your calendar and the creative ZIP has been generated.`),
      para('Open the studio to review each draft, adjust copy, and export — nothing publishes automatically.'),
      cta('Review your calendar', process.env.APP_URL ?? '/studio'),
    ].join('')),
  };
}

export function inviteEmail(name: string): { subject: string; html: string } {
  return {
    subject: 'You have been invited to SwiftPilot Social Studio',
    html: shell('You are on the team', [
      para(`Hi ${name || 'there'},`),
      para('An account was created for you on SwiftPilot Social Studio. Sign in with this email to open your workspace.'),
      cta('Sign in', process.env.APP_URL ?? '/studio'),
    ].join('')),
  };
}
