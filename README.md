# Catalyst Wallet Demo

Responsive multi-page crypto wallet front-end built with HTML, Bootstrap 5, CSS, and vanilla JavaScript. Fetches live BTC/ETH/SOL prices from CoinGecko and stores demo holdings + transactions in `localStorage`.

## Pages

- `index.html` – Overview dashboard with total balance and asset list.
- `send.html` – Send form (updates holdings + logs transaction).
- `receive.html` – Generate mock address + decorative pseudo QR.
- `transactions.html` – Table of locally stored transactions (includes deposits & sends, filter/sort/export).
- `add.html` – Add Funds (deposit simulator increments holdings and logs a DEPOSIT entry).
- `login.html` / `signup.html` – Demo authentication screens (local only).
- `settings.html` – Adjust demo holdings.
- `security.html` – Password strength meter & 2FA toggle (local only).

## Features

- Live price polling every 60s (CoinGecko public API).
- Animated total balance glow & card hover transitions.
- Portfolio allocation percentages per asset.
- Address generator with copy and length insight.
- Recipient live validation (ETH-style) in send form.
- Transactions filtering, sorting, and JSON export.
- Add Funds deposit simulator (+ holdings, logs transaction type DEPOSIT).
- Local signup/login/logout (SHA-256 hashed password in storage; session key).
- Mobile responsive sidebar with hamburger.
- Holdings adjustment for presentation demos.
- Local transaction history.

## Running

Open `signup.html` to create a demo account (stored in your browser). You will be redirected to `index.html` after login. Use `add.html` to simulate deposits. All data resides in browser storage—refresh keeps state; clearing storage or using private browsing resets.

## Customization

Edit `js/prices.js` to add more assets via CoinGecko. Add logos by placing images in `images/` and referencing via `<img>`.

Authentication is purely client-side. For production replace with secure server-backed auth, proper password hashing (argon2/bcrypt), rate limiting, CSRF protection, and real blockchain integration for deposits/withdrawals.

---

This is a demo (no real blockchain interaction). For production, integrate secure wallet libraries, proper QR encoding, server-side persistence, and real transaction broadcasting.
