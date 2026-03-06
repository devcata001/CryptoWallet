/* ── dashboard.js — Nova Wallet Dashboard logic ─────────────────────── */
'use strict';

/* ══ AUTH GUARD ══════════════════════════════════════════════════════ */
(function authGuard() {
  const hasPassword = !!localStorage.getItem('nv_password');
  const isUnlocked = sessionStorage.getItem('nv_unlocked') === '1';
  if (!hasPassword) { location.replace('onboarding.html'); return; }
  if (!isUnlocked) { location.replace('welcome-pin.html'); return; }
})();

/* ══ ASSET REGISTRY ══════════════════════════════════════════════════ */
const ASSETS = [
  { sym: 'BTC', name: 'Bitcoin', cgId: 'bitcoin', img: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', color: '#F7931A', price: 65000, change24h: 2.4 },
  { sym: 'ETH', name: 'Ethereum', cgId: 'ethereum', img: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', color: '#627EEA', price: 3400, change24h: 1.8 },
  { sym: 'BNB', name: 'BNB', cgId: 'binancecoin', img: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', color: '#F3BA2F', price: 590, change24h: 0.7 },
  { sym: 'SOL', name: 'Solana', cgId: 'solana', img: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', color: '#9945FF', price: 175, change24h: 5.2 },
  { sym: 'USDT', name: 'Tether', cgId: 'tether', img: 'https://assets.coingecko.com/coins/images/325/small/Tether.png', color: '#26A17B', price: 1.00, change24h: 0.02 },
  { sym: 'USDC', name: 'USD Coin', cgId: 'usd-coin', img: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png', color: '#2775CA', price: 1.00, change24h: 0.01 },
];

const DEFAULT_HOLDINGS = { BTC: 0, ETH: 0, BNB: 0, SOL: 0, USDT: 0, USDC: 0 };

function getH() { const s = JSON.parse(localStorage.getItem('nv_holdings') || '{}'); return Object.assign({}, DEFAULT_HOLDINGS, s); }
function saveH(h) { localStorage.setItem('nv_holdings', JSON.stringify(h)); }

/* ══ PRICE FETCHING ══════════════════════════════════════════════════ */
const CACHE_KEY = 'nv_price_cache';
const CACHE_TTL = 120_000; // 2 minutes

function loadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && Date.now() - c.ts < CACHE_TTL) {
      ASSETS.forEach(a => { if (c.prices[a.cgId]) { a.price = c.prices[a.cgId].usd; a.change24h = c.prices[a.cgId].chg; } });
      return true;
    }
  } catch (_) { /* ignore */ }
  return false;
}

async function fetchPrices() {
  if (loadCache()) {
    document.getElementById('lastUpdated').textContent =
      'Cached · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    renderAll();
    return;
  }
  try {
    const ids = ASSETS.map(a => a.cgId).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&precision=6`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    const prices = {};
    ASSETS.forEach(a => {
      const d = data[a.cgId];
      if (d) { a.price = d.usd; a.change24h = d.usd_24h_change || 0; prices[a.cgId] = { usd: d.usd, chg: a.change24h }; }
    });
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), prices }));
    document.getElementById('lastUpdated').textContent =
      'Live · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    document.getElementById('lastUpdated').textContent = 'Prices cached';
  }
  renderAll();
}

/* ══ RENDER ASSETS ═══════════════════════════════════════════════════ */
function renderAll() {
  const h = getH();
  let total = 0, totalChange = 0;
  ASSETS.forEach(a => { total += (h[a.sym] || 0) * a.price; });

  const html = ASSETS.map(a => {
    const qty = h[a.sym] || 0, usd = qty * a.price, chg = a.change24h;
    totalChange += usd * (chg / 100);
    return `
    <div class="asset-row" onclick="openSheet('buySheet');document.getElementById('buyAsset').value='${a.sym}';updateBuyPreview();">
      <div class="asset-icon">
        <img src="${a.img}" alt="${a.sym}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
        <div class="fallback" style="display:none;background:${a.color};width:100%;height:100%;border-radius:50%;align-items:center;justify-content:center;">${a.sym[0]}</div>
      </div>
      <div class="asset-info">
        <div class="asset-name">${a.name}</div>
        <div class="asset-sym">${fmtPrice(a.price)}</div>
      </div>
      <div class="asset-right">
        <div class="asset-usd">$${fmt(usd, 2)}</div>
        <div class="asset-change ${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('assetList').innerHTML = html;

  const balEl = document.getElementById('totalBalanceEl');
  balEl.textContent = '$' + fmt(total, 2);
  const len = balEl.textContent.length;
  balEl.classList.remove('shrink-1', 'shrink-2', 'shrink-3');
  if (len > 14) balEl.classList.add('shrink-3');
  else if (len > 11) balEl.classList.add('shrink-2');
  else if (len > 8) balEl.classList.add('shrink-1');

  const chgPct = total > 0 ? (totalChange / (total - totalChange)) * 100 : 0;
  const upDown = totalChange >= 0 ? 'up' : 'down';
  const arrow = totalChange >= 0 ? 'caret-up' : 'caret-down';
  const chgEl = document.getElementById('totalChangeEl');
  chgEl.className = 'balance-change ' + upDown;
  chgEl.innerHTML = `<i class="ph-bold ph-${arrow}"></i> ${totalChange >= 0 ? '+' : ''}$${fmt(Math.abs(totalChange), 2)} (${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%) today`;

  updateBuyPreview();
  renderTxList();
}

/* ── formatters ── */
function fmt(n, dp) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
function fmtPrice(p) {
  if (p >= 1) return '$' + fmt(p, 2);
  if (p >= 0.01) return '$' + Number(p).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return '$' + Number(p).toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
}

/* ══ TAB ══════════════════════════════════════════════════════════════ */
function switchTab(btn, panel) {
  document.querySelectorAll('#tabBar button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['cryptoPanel', 'nftPanel', 'defiPanel'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  const t = document.getElementById(panel); if (t) t.style.display = '';
}

/* ══ SHEETS ═══════════════════════════════════════════════════════════ */
function openSheet(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'receiveSheet') showReceiveAddr();
  if (id === 'searchSheet') renderPriceList();
  if (id === 'buySheet') renderBuyPrices();
}
function closeSheet(id) { document.getElementById(id).classList.remove('open'); }
function bgClose(e, id) { if (e.target === document.getElementById(id)) closeSheet(id); }

/* ══ RECEIVE ══════════════════════════════════════════════════════════ */
let currentAddr = '';


const RECEIVE_NETWORKS = {
  ETH: 'Ethereum Mainnet (ERC-20)',
  BNB: 'BNB Smart Chain (BEP-20)',
  USDT: 'Ethereum Mainnet (ERC-20)',
  USDT_BEP20: 'BNB Smart Chain (BEP-20)',
  USDC: 'Ethereum Mainnet (ERC-20)',
  USDC_BEP20: 'BNB Smart Chain (BEP-20)',
  BTC: 'Bitcoin Network (Native SegWit)',
  SOL: 'Solana Mainnet',
};

async function deriveAddr(sym) {
  const enc = sessionStorage.getItem('nv_enc_key');
  if (!enc) return '—';
  try {
    const wallet = await NW.initFromSRP(enc);
    const evm = ['ETH', 'USDT', 'USDC', 'BNB', 'USDT_BEP20', 'USDC_BEP20'];
    if (evm.includes(sym)) return wallet.evmAddress;
    if (sym === 'BTC') return wallet.btcAddress;
    if (sym === 'SOL') return wallet.solAddress;
    return wallet.evmAddress;
  } catch (e) {
    console.warn('[NW] deriveAddr failed:', e.message);
    return '—';
  }
}

async function showReceiveAddr() {
  const sym = document.getElementById('receiveAsset').value;
  document.getElementById('walletAddr').textContent = 'Deriving address…';
  document.getElementById('receiveNetwork').textContent = RECEIVE_NETWORKS[sym] || '';
  document.getElementById('qrWrap').innerHTML = '';
  currentAddr = await deriveAddr(sym);
  document.getElementById('walletAddr').textContent = currentAddr;
  document.getElementById('walletAddr').title = currentAddr;
  const wrap = document.getElementById('qrWrap');
  try { new QRCode(wrap, { text: currentAddr, width: 150, height: 150, colorDark: '#000', colorLight: '#fff' }); } catch (_) { }
}

function copyAddr() {
  if (!currentAddr) { openNotify('No address loaded', 'error'); return; }
  navigator.clipboard.writeText(currentAddr)
    .then(() => openNotify('Address copied!', 'success'))
    .catch(() => openNotify(currentAddr, 'success'));
}

/* ══ TRANSACTIONS ════════════════════════════════════════════════════ */
function getTxs() { return JSON.parse(localStorage.getItem('nv_txs') || '[]'); }
function saveTxs(txs) { localStorage.setItem('nv_txs', JSON.stringify(txs.slice(0, 100))); }

function logTx(type, sym, qty, usd, addr, txHash) {
  const txs = getTxs();
  txs.unshift({ type, sym, qty, usd: usd || 0, addr: addr || '', hash: txHash || '', ts: Date.now() });
  saveTxs(txs);
}

function renderTxList() {
  const txs = getTxs();
  const el = document.getElementById('txList');
  if (!txs.length) {
    el.innerHTML = '<div class="empty-state"><i class="ph-bold ph-clock-counter-clockwise"></i>No transactions yet.</div>';
    return;
  }
  const isStable = s => ['USDT', 'USDC'].includes(s);
  el.innerHTML = txs.map(tx => {
    const a = ASSETS.find(x => x.sym === tx.sym) || {};
    const icon = tx.type === 'buy' ? 'ph-arrow-down' : 'ph-arrow-up';
    const iconBg = tx.type === 'buy' ? 'rgba(61,255,32,.15)' : 'rgba(255,77,77,.15)';
    const iconCol = tx.type === 'buy' ? 'var(--green)' : 'var(--error)';
    const label = tx.type === 'buy' ? 'Received' : 'Sent';
    const qtyFmt = fmt(tx.qty, isStable(tx.sym) ? 2 : 6);
    const date = new Date(tx.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = new Date(tx.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const shortAddr = tx.addr ? tx.addr.slice(0, 6) + '…' + tx.addr.slice(-4) : '';
    const explorerHref = tx.hash ? NW.explorerUrl(tx.hash, tx.sym) : null;
    const hashTag = explorerHref
      ? `<a href="${explorerHref}" target="_blank" style="color:var(--green);font-size:11px;text-decoration:none;" title="View on explorer">${tx.hash.slice(0, 8)}… ↗</a>`
      : '';
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
      <div style="width:40px;height:40px;border-radius:50%;background:${iconBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="ph-bold ${icon}" style="color:${iconCol};font-size:15px;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:14px;">${label} ${tx.sym}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px;">${date} · ${time}${shortAddr ? ' · ' + shortAddr : ''}${hashTag ? ' · ' + hashTag : ''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-weight:700;font-size:14px;color:${iconCol};">${tx.type === 'buy' ? '+' : '-'}${qtyFmt} ${tx.sym}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px;">$${fmt(tx.usd, 2)}</div>
      </div>
    </div>`;
  }).join('');
}

/* ══ SEND ════════════════════════════════════════════════════════════ */
const ADDR_FORMATS = {
  EVM: { re: /^0x[a-fA-F0-9]{40}$/, hint: 'Must be 0x followed by 40 hex characters' },
  BTC: { re: /^(bc1[a-z0-9]{25,39}|[13][a-zA-Z0-9]{25,34})$/, hint: 'Invalid Bitcoin address format' },
  SOL: { re: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, hint: 'Invalid Solana address format' },
};
const SYM_ADDR_TYPE = { ETH: 'EVM', BNB: 'EVM', USDT: 'EVM', USDC: 'EVM', BTC: 'BTC', SOL: 'SOL' };

function validateSendAddr(addr, sym) {
  const type = SYM_ADDR_TYPE[sym] || 'EVM';
  const f = ADDR_FORMATS[type];
  return f.re.test(addr) ? null : f.hint;
}

function updateSendPreview() {
  const sym = document.getElementById('sendAsset').value;
  const amt = parseFloat(document.getElementById('sendAmt').value) || 0;
  const a = ASSETS.find(x => x.sym === sym);
  const h = getH();
  if (!a || !amt) { document.getElementById('sendPreview').innerHTML = ''; return; }
  const stable = ['USDT', 'USDC'].includes(sym);
  const fee = stable ? 2 : amt * 0.002;
  const usd = amt * a.price;
  document.getElementById('sendPreview').innerHTML =
    `≈ $${fmt(usd, 2)} USD &nbsp;·&nbsp; Fee ≈ ${stable ? '$' + fee : fee.toFixed(6) + ' ' + sym} &nbsp;·&nbsp; Held: ${fmt(h[sym] || 0, stable ? 2 : 6)} ${sym}`;
}

async function doSend() {
  const addr = document.getElementById('sendAddr').value.trim();
  const amt = parseFloat(document.getElementById('sendAmt').value) || 0;
  const sym = document.getElementById('sendAsset').value;
  const errEl = document.getElementById('sendError');
  const errMsg = document.getElementById('sendErrMsg');
  const btn = document.querySelector('#sendSheet .btn-primary');
  const se = m => { errMsg.textContent = m; errEl.style.display = 'flex'; };

  errEl.style.display = 'none';
  if (!addr) return se('Enter a recipient address');
  const addrErr = validateSendAddr(addr, sym);
  if (addrErr) return se(addrErr);
  if (!amt || amt <= 0) return se('Enter an amount > 0');
  const h = getH();
  if ((h[sym] || 0) < amt) return se('Insufficient ' + sym + ' balance');

  btn.disabled = true;
  btn.innerHTML = '<i class="ph-bold ph-circle-notch" style="animation:spin 1s linear infinite"></i> Broadcasting…';

  try {
    const enc = sessionStorage.getItem('nv_enc_key');
    const walletData = await NW.initFromSRP(enc);
    let txHash;

    if (sym === 'ETH') {
      txHash = await NW.sendETH(walletData.privateKeyEVM, addr, amt);
    } else if (sym === 'BNB') {
      txHash = await NW.sendBNB(walletData.privateKeyEVM, addr, amt);
    } else if (['USDT', 'USDC'].includes(sym)) {
      txHash = await NW.sendToken(walletData.privateKeyEVM, addr, amt, sym);
    } else if (sym === 'SOL') {
      txHash = await NW.sendSOL(walletData.solSecretHex, addr, amt);
    } else if (sym === 'BTC') {
      throw new Error('BTC sending support coming soon — please use a desktop wallet for BTC');
    }

    const usd = amt * ((ASSETS.find(x => x.sym === sym) || {}).price || 0);
    logTx('send', sym, amt, usd, addr, txHash);
    renderAll();
    closeSheet('sendSheet');
    document.getElementById('sendAddr').value = '';
    document.getElementById('sendAmt').value = '';
    openTxModal('send', sym, amt, usd, addr, txHash);
    // Refresh on-chain balances after a short delay
    setTimeout(fetchOnChainBalances, 8000);

  } catch (e) {
    const msg = e.message || 'Transaction failed';
    se(msg.includes('insufficient') || msg.includes('funds') ? 'Insufficient funds or gas' : msg);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> Send';
  }
}

/* ══ BUY ══════════════════════════════════════════════════════════════ */
function updateBuyPreview() {
  const sym = document.getElementById('buyAsset') ? document.getElementById('buyAsset').value : 'ETH';
  const usd = parseFloat(document.getElementById('buyAmt') ? document.getElementById('buyAmt').value : 0) || 0;
  const a = ASSETS.find(x => x.sym === sym);
  if (!a || !usd) { document.getElementById('buyPreview').innerHTML = ''; return; }
  const qty = usd / a.price;
  const stable = ['USDT', 'USDC'].includes(sym);
  document.getElementById('buyPreview').innerHTML =
    `You receive: <span style="color:var(--green);font-weight:700;">${fmt(qty, stable ? 2 : 6)} ${sym}</span> &nbsp;·&nbsp; 1 ${sym} = ${fmtPrice(a.price)}`;
}

function doBuy() {
  const sym = document.getElementById('buyAsset').value;
  const usd = parseFloat(document.getElementById('buyAmt').value) || 0;
  const a = ASSETS.find(x => x.sym === sym);
  if (!a || usd <= 0) { openNotify('Enter a USD amount', 'error'); return; }
  const qty = usd / a.price;
  const h = getH();
  h[sym] = (h[sym] || 0) + qty;
  saveH(h);
  logTx('buy', sym, qty, usd);
  renderAll();
  closeSheet('buySheet');
  openTxModal('buy', sym, qty, usd, null);
}

/* ══ PRICE LISTS ══════════════════════════════════════════════════════ */
function renderBuyPrices() {
  document.getElementById('buyPriceList').innerHTML = ASSETS.map(a => {
    const chg = a.change24h, col = chg >= 0 ? '#3DFF20' : 'var(--error)';
    return `<div class="price-ticker">
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="${a.img}" style="width:24px;height:24px;border-radius:50%;background:var(--input-bg);" onerror="this.style.background='${a.color}'" />
        <span style="font-weight:600;font-size:14px;">${a.sym}</span>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:700;font-size:14px;">${fmtPrice(a.price)}</div>
        <div style="font-size:11px;color:${col};">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</div>
      </div>
    </div>`;
  }).join('');
}

function renderPriceList() {
  const h = getH();
  document.getElementById('priceListFull').innerHTML = ASSETS.map(a => {
    const qty = h[a.sym] || 0, usd = qty * a.price, chg = a.change24h, col = chg >= 0 ? '#3DFF20' : 'var(--error)';
    return `<div class="price-ticker">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="${a.img}" style="width:32px;height:32px;border-radius:50%;background:var(--input-bg);" onerror="this.style.background='${a.color}'" />
        <div>
          <div style="font-weight:600;font-size:14px;">${a.name}</div>
          <div style="font-size:12px;color:var(--muted);">${a.sym} &nbsp;·&nbsp; ${fmtPrice(a.price)}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:700;font-size:14px;">$${fmt(usd, 2)}</div>
        <div style="font-size:12px;color:${col};">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</div>
      </div>
    </div>`;
  }).join('');
}

/* ══ NOTIFY ═══════════════════════════════════════════════════════════ */
function openNotify(msg, type) {
  const el = document.createElement('div');
  el.className = 'notify notify-' + (type || 'success');
  el.style.pointerEvents = 'all';
  const icon = document.createElement('i');
  icon.className = `ph-bold ph-${type === 'error' ? 'warning' : 'check-circle'}`;
  el.appendChild(icon);
  el.appendChild(document.createTextNode(' ' + msg));
  document.getElementById('notifyArea').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ══ TX SUCCESS MODAL ════════════════════════════════════════════════ */
function openTxModal(type, sym, qty, usd, addr) {
  const stable = ['USDT', 'USDC'].includes(sym);
  const qtyStr = fmt(qty, stable ? 2 : 6);
  const a = ASSETS.find(x => x.sym === sym) || {};
  const fee = stable ? (type === 'send' ? '$2.00' : '—') : (type === 'send' ? fmt(qty * 0.002, 6) + ' ' + sym : '—');
  const now = new Date();
  const ts = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ', ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const isSend = type === 'send';

  document.getElementById('txModalTitle').textContent = isSend ? 'Sent' : 'Bought';
  document.getElementById('txModalAmt').textContent = (isSend ? '-' : '+') + qtyStr + ' ' + sym;
  document.getElementById('txModalUsd').textContent = '≈ $' + fmt(usd, 2) + ' USD';

  document.getElementById('txModalRing')?.classList.toggle('send', isSend);
  document.getElementById('txModalAmt')?.classList.toggle('send', isSend);

  const rows = [
    ['Status', '<span style="color:#3DFF20;font-weight:700;">Confirmed ✓</span>'],
    ['Type', isSend ? 'Send' : 'Buy'],
    ['Asset', `<img src="${a.img || ''}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px;" /> ${sym}`],
    ...(addr ? [['To', addr.slice(0, 6) + '…' + addr.slice(-4)]] : []),
    ['Network fee', fee],
    ['Date', ts],
  ];
  document.getElementById('txModalRows').innerHTML = rows
    .map(([k, v]) => `<div class="tx-modal-row"><span>${k}</span><span class="val">${v}</span></div>`)
    .join('');

  document.getElementById('txSuccessModal').classList.add('open');
}

/* ══ BACKUP WARNING ══════════════════════════════════════════════════ */
(function checkBackup() {
  const backedUp = !!localStorage.getItem('nv_srp_backed_up');
  const banner = document.getElementById('backupWarnBanner');
  if (!banner || backedUp) return;
  const snoozeUntil = parseInt(localStorage.getItem('nv_backup_snooze_until') || '0', 10);
  if (Date.now() < snoozeUntil) return;
  banner.style.display = 'block';
})();

function snoozeBackupWarn() {
  localStorage.setItem('nv_backup_snooze_until', String(Date.now() + 24 * 60 * 60 * 1000));
  const banner = document.getElementById('backupWarnBanner');
  if (banner) {
    banner.style.transition = 'opacity .3s';
    banner.style.opacity = '0';
    setTimeout(() => (banner.style.display = 'none'), 300);
  }
}

/* ══ ON-CHAIN BALANCE FETCH ═══════════════════════════════════════ */
async function fetchOnChainBalances() {
  const enc = sessionStorage.getItem('nv_enc_key');
  if (!enc) return;
  const statusEl = document.getElementById('lastUpdated');
  const prev = statusEl ? statusEl.textContent : '';
  if (statusEl) statusEl.textContent = 'Fetching wallet…';
  try {
    const walletData = await NW.initFromSRP(enc);
    const balances = await NW.fetchAllBalances(walletData);
    saveH(balances);
    renderAll();
    if (statusEl) statusEl.textContent =
      'On-chain · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    console.warn('[NW] Balance fetch failed:', e.message);
    if (statusEl) statusEl.textContent = prev;
  }
}

/* ══ HELPERS ══════════════════════════════════════════════════════ */
const bytesToHex = b => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
const hexToBytes = h => new Uint8Array(h.match(/.{2}/g).map(x => parseInt(x, 16)));

/* ══ BOOT ════════════════════════════════════════════════════════ */
renderAll();
fetchPrices();
fetchOnChainBalances();
setInterval(fetchPrices, 60_000);
setInterval(fetchOnChainBalances, 5 * 60_000); // refresh on-chain every 5 min
