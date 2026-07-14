# Paperweight 🗿

**Your inbox knows where your data lives. We help you take back control.**

<img src="website/public/dashboard.png" alt="Dashboard" width="600" />

Every account you create, every service you sign up for, every online purchase is connected to your email address. Most people have 100+ accounts they've forgotten about, creating security risks and privacy exposure.

Paperweight scans your inbox to map your digital footprint, then helps you take back control and delete your data.

Local-first. Your data stays on your computer. Respecting your privacy by default.

## Features

- **Marketing/Bulk unsubscribe** — Find an unsubscribe from marketing and bulk mailing lists in minutes
- **Account inventory** — Discover which vendors and services have your data
- **Breach alerts** — Know when companies you use get breached (via haveibeenpwned.com)
- **GDPR deletion support** — Generate data deletion requests to reduce exposure
- **Local-first** — Your emails and settings stay on your machine
- **Privacy-respecting** — No data sent to external servers
- **Open development** — Built in public, source code available for audit

## Email Providers

- ✅ Custom IMAP
- ✅ Google / Gmail
- ✅ Microsoft
- ✅ Apple
- ✅ Proton Mail (via Bridge)

IMAP Presets: Proton, Yahoo Mail, Fastmail, Yandex, Zoho, Mailbox.org, Posteo, GMX.

## Quick Start

1. Download [latest release](https://github.com/wslyvh/paperweight/releases) for your platform
2. Connect your email
3. Scan your inbox in ~2 minutes
4. Start unsubscribing and deleting

## License

Core features available for free. Upgrade for unlimited history, multiple accounts and to support open-source software development.

- **Free tier**: 90-day email scan, core features included
- **Perpetual license**: All features, unlimited email history, multiple email accounts, permanent use of Paperweight

[Buy a perpetual license and support development →](https://www.paperweight.email/#pricing)

## Development

If you're building from source you need to add your own OAuth credentials. Copy [`.env.example`](.env.example) as `.env` and add your own Google and Microsoft client info.

**Google** - https://console.cloud.google.com/
- Create OAuth 2.0 credentials, application type "Desktop app"
- Enable the **Gmail API** in API Library
- Add scope `https://www.googleapis.com/auth/gmail.modify` on the consent screen
- Add yourself as a test user while the app is in testing mode
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

**Microsoft** - https://portal.azure.com/
- Register an app, supported account types "Personal + work/school"
- Authentication → add "Mobile and desktop applications" platform with redirect URI `http://localhost`
- API permissions → Microsoft Graph → Delegated → add `User.Read`, `Mail.ReadWrite`, `Mail.Send`, `offline_access`, `openid`, `profile`
- Set `MICROSOFT_CLIENT_ID` (no secret — we use PKCE)

## Contributing

Feedback, bug reports, and PRs are welcome.

**Language lexicons** — Paperweight's analysis engine classifies mail
(purchases, updates, promotions) and finds unsubscribe links using
per-language phrase lexicons. English and Dutch are curated; other languages
need native speakers. Adding or improving a language is a single-file data
contribution — no engine knowledge required. See
[`analysis/src/data/lexicons/README.md`](analysis/src/data/lexicons/README.md)
for the rules.
