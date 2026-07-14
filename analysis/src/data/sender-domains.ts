// Sender-domain registries for the type classifier. Real platform domains,
// deliberately: this is public infrastructure knowledge, not user data.
// Growth paths: real-mailbox mining and community contributions — a missing
// platform is a safe miss (its mail falls back to promotion/update via list
// headers), a wrong entry is a false positive.

// Social networks whose notification mail classifies as type "social".
// Matched against the from domain INCLUDING subdomains (platforms mail from
// e.linkedin.com, mail.goodreads.com, ...).
export const SOCIAL_DOMAINS: string[] = [
  "linkedin.com",
  "facebookmail.com",
  "facebook.com",
  "instagram.com",
  "threads.net",
  "twitter.com",
  "x.com",
  "redditmail.com",
  "reddit.com",
  "discord.com",
  "meetup.com",
  "strava.com",
  "pinterest.com",
  "tiktok.com",
  "snapchat.com",
  "nextdoor.com",
  "nextdoor.nl",
  "mastodon.social",
  "bsky.app",
  "youtube.com",
  "twitch.tv",
  "tumblr.com",
  "quora.com",
  "goodreads.com",
  "couchsurfing.org",
  "couchsurfing.com",
  "foursquare.com",
  "xing.com",
  "telegram.org",
  "whatsapp.com",
  "tinder.com",
  "bumble.com",
  "hyves.nl", // defunct, but historic mail still gets classified
];

// Consumer mail providers: a sender at one of these domains is a human, not
// an organization (organizations send from their own domain). Matched
// EXACTLY against the from domain — lookalikes (9gagmail.com) and provider
// infrastructure mail (accounts.google.com) must not hit.
export const PERSONAL_DOMAINS: string[] = [
  // Google
  "gmail.com",
  "googlemail.com",
  // Microsoft
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.de",
  "hotmail.fr",
  "hotmail.nl",
  "live.com",
  "live.co.uk",
  "live.be",
  "live.de",
  "live.fr",
  "live.nl",
  "msn.com",
  // Yahoo
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.de",
  "yahoo.fr",
  "ymail.com",
  // Apple
  "icloud.com",
  "me.com",
  "mac.com",
  // Proton
  "protonmail.com",
  "proton.me",
  "pm.me",
  // Privacy / independent
  "fastmail.com",
  "tutanota.com",
  "tuta.com",
  // AOL
  "aol.com",
  // German providers
  "gmx.de",
  "gmx.net",
  "gmx.com",
  "web.de",
  "t-online.de",
  // French providers
  "laposte.net",
  "orange.fr",
  "wanadoo.fr",
  // UK providers
  "btinternet.com",
  // Italian providers
  "libero.it",
  // Dutch ISPs
  "hetnet.nl",
  "planet.nl",
  "kpnmail.nl",
  "xs4all.nl",
  "ziggo.nl",
  "upcmail.nl",
  "casema.nl",
  "home.nl",
];
