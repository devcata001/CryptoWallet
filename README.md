# Nova Wallet

A polished, mobile-first crypto wallet front-end built with HTML5, CSS3, and vanilla JavaScript. Styled like a real wallet app — no frameworks, no dependencies beyond Font Awesome and QRCode.js.

---

## Pages

| File                     | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| `index.html`             | Animated splash screen → redirects to onboarding or PIN unlock |
| `pages/onboarding.html`  | Welcome screen — Create wallet or Import via secret phrase     |
| `pages/features.html`    | Feature highlights before wallet setup                         |
| `pages/email.html`       | Email/account entry before SRP reveal                          |
| `pages/confirm.html`     | Secret Recovery Phrase (SRP) reveal — blurred until tapped     |
| `pages/create-pin.html`  | 3-word quiz to verify the user saved their SRP                 |
| `pages/welcome-pin.html` | PIN entry screen for returning users                           |
| `pages/success.html`     | Wallet creation success screen                                 |
| `pages/dashboard.html`   | Main wallet — balance, assets, send, buy, receive, activity    |
| `pages/settings.html`    | App settings                                                   |

---

## Features

### Wallet & Onboarding

- Full onboarding flow: create wallet → view SRP → quiz confirmation → PIN setup
- BIP39-wordlist Secret Recovery Phrase (12 words, generated in-browser)
- SRP stored in `localStorage`; deterministic address derivation per symbol
- PIN-protected wallet unlock screen

### Dashboard

- Live crypto prices via CoinGecko public API (2-minute cache, 60s auto-refresh)
- Total portfolio balance with 24h change indicator ($ and %)
- Per-asset holdings, USD value, and 24h change colour coding
- Animated balance hero with responsive font shrinking for large numbers
- Bottom sheet actions: **Buy**, **Send**, **Receive**, **Swap** (coming soon)
- Tab panels: Crypto · NFTs · DeFi
- Recent activity feed with transaction type icons

### Buy (Add Funds)

- Select asset + enter USD amount → converts to crypto at live price
- Live preview showing crypto amount received and current price
- **$200 total portfolio cap** — if a purchase would push the portfolio over $200, the purchase is blocked and an error shows how much headroom remains
- Transaction success modal on completion

### Send

- Recipient address input with live ETH-style validation
- Amount + asset selector with live fee preview
- Insufficient balance guard
- **Red-themed transaction success modal** (ring, icon, amount all in red) showing: status, asset, recipient address (truncated), network fee, and timestamp

### Transaction Success Modal

- Centered full-overlay modal with blur backdrop (like MetaMask / Trust Wallet)
- Round icon ring — **green for Buy**, **red for Send**
- Screenshot-ready receipt: confirmed status, type, asset icon, to address, fee, date/time
- "Done" button to dismiss

### Receive

- Asset selector with network label (ERC-20, BEP-20, Native SegWit, Solana Mainnet)
- Deterministic wallet address derived from SRP + symbol (same address every time)
- QR code generated via QRCode.js
- One-tap copy address

### Backup Warning Banner

- Persistent amber/orange banner shown on the dashboard if the SRP has **not** been backed up
- Shows for any user who hasn't completed the phrase quiz (`nv_srp_backed_up` flag)
- **"Back up now"** → goes directly to the SRP confirmation quiz
- **"Remind me later"** → snoozes for 24 hours (time-based, persists across page loads), then reappears automatically
- Banner permanently dismissed once backup is verified

### Security

- SHA-256 hashed password stored in `localStorage`
- Session key validated on every page load; unauthenticated users redirected to login
- Multi-user support — holdings and transactions keyed per username
- Password change form with current-password verification

---

## Project Structure

```
/
├── index.html                 # Splash screen & entry point
├── README.md
├── css/
│   ├── nova.css               # Design system (variables, components, animations)
│   └── style.css              # Legacy styles
├── js/
│   ├── script.js              # Auth, send/buy forms, transaction history, profile
│   └── prices.js              # CoinGecko price service & holdings renderer
└── pages/
    ├── onboarding.html
    ├── features.html
    ├── email.html
    ├── confirm.html           # SRP reveal
    ├── create-pin.html        # SRP quiz + sets nv_srp_backed_up flag
    ├── welcome-pin.html
    ├── success.html
    ├── dashboard.html         # Main app shell
    └── settings.html
```

---

## localStorage Keys

| Key                      | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `nv_user`                | `{ username, passHash }` — registered account        |
| `nv_session`             | `{ username, ts }` — active session                  |
| `nv_srp`                 | 12-word Secret Recovery Phrase array                 |
| `nv_srp_backed_up`       | `'1'` if the user completed the SRP quiz             |
| `nv_backup_snooze_until` | Timestamp until backup banner is snoozed             |
| `nv_unlocked`            | `'1'` after PIN/quiz success                         |
| `nv_holdings`            | `{ BTC, ETH, BNB, SOL, USDT, USDC }` — demo balances |
| `nv_txs`                 | Array of transaction objects (max 100)               |
| `nv_price_cache`         | Cached CoinGecko prices with timestamp               |
| `nv_password`            | PIN hash for welcome-pin screen                      |

---

## Running

Open `index.html` directly in any modern browser — no build step needed. The splash screen will route to onboarding (new user) or the PIN unlock screen (returning user).

To reset everything: open DevTools → Application → Local Storage → clear all `nv_*` keys.

---

## Notes

- All data is stored in browser `localStorage` — no server, no real blockchain.
- The $200 portfolio cap blocks purchases that would exceed the limit; remove or adjust the check in `doBuy()` inside `dashboard.html`.
- CoinGecko free tier may rate-limit; the app falls back to cached/default prices gracefully.
- For production: replace client-side auth with server-backed sessions, use a proper HD wallet library for key derivation, broadcast real transactions, and store nothing sensitive in `localStorage`.
