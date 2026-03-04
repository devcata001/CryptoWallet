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

- **PBKDF2** (100 000 iterations, SHA-256, random 16-byte salt) used for password hashing — salt embedded in stored value as `{saltHex}:{hashHex}`
- **AES-GCM 256-bit** encrypted Secret Recovery Phrase — never stored in plaintext; key derived from password via PBKDF2 using a separate `nv_srp_salt`
- Derived AES key exported to `sessionStorage` (`nv_enc_key`) on login/setup — clears automatically on tab/browser close
- **Auth guard** on dashboard: redirects to PIN screen if `sessionStorage.nv_unlocked` is absent — blocks direct URL navigation
- Session token (`nv_unlocked`) stored in `sessionStorage` only — forces re-authentication on browser restart
- **Rate limiting**: 5 failed PIN attempts trigger a 30-second lockout
- Password change re-derives and re-encrypts the SRP with the new key — old key invalidated immediately
- Multi-user support — holdings and transactions keyed per username
- Password change form requires current-password verification

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

## localStorage / sessionStorage Keys

| Key                      | Store       | Purpose                                                |
| ------------------------ | ----------- | ------------------------------------------------------ |
| `nv_user`                | local       | `{ username, passHash }` — registered account          |
| `nv_session`             | local       | `{ username, ts }` — active session                    |
| `nv_srp`                 | local       | AES-GCM encrypted Secret Recovery Phrase (`iv:base64`) |
| `nv_srp_salt`            | local       | Random 16-byte hex salt for SRP AES key derivation     |
| `nv_srp_backed_up`       | local       | `'1'` if the user completed the SRP quiz               |
| `nv_backup_snooze_until` | local       | Timestamp until backup banner is snoozed               |
| `nv_unlocked`            | **session** | `'1'` after PIN success — cleared on browser close     |
| `nv_enc_key`             | **session** | Exported AES-GCM key bytes (hex) for SRP decryption    |
| `nv_holdings`            | local       | `{ BTC, ETH, BNB, SOL, USDT, USDC }` — demo balances   |
| `nv_txs`                 | local       | Array of transaction objects (max 100)                 |
| `nv_price_cache`         | local       | Cached CoinGecko prices with timestamp                 |
| `nv_password`            | local       | PBKDF2 hash: `{16-byte saltHex}:{SHA-256 hashHex}`     |

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
