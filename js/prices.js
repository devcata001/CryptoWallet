// prices.js - fetch live crypto prices
const PriceService = (() => {
    const API = 'https://api.coingecko.com/api/v3/simple/price';
    const ASSETS = [
        { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', color: '#f7931a' },
        { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', color: '#2775ca' },
        { id: 'tether', symbol: 'USDT', name: 'Tether', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png', color: '#26a17b' },
        { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', color: '#6d38ff' },
        { id: 'binancecoin', symbol: 'BNB', name: 'BNB', logo: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png', color: '#f3ba2f' },
        { id: 'solana', symbol: 'SOL', name: 'Solana', logo: 'https://cryptologos.cc/logos/solana-sol-logo.png', color: '#00ffa3' },
        { id: 'tron', symbol: 'TRX', name: 'TRON', logo: 'https://cryptologos.cc/logos/tron-trx-logo.png', color: '#ec0928' },
        { id: 'the-open-network', symbol: 'TON', name: 'Toncoin', logo: 'https://cryptologos.cc/logos/toncoin-ton-logo.png', color: '#0098ea' },
        { id: 'sui', symbol: 'SUI', name: 'Sui', logo: 'https://cryptologos.cc/logos/sui-sui-logo.png', color: '#6cdcff' },
        { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', logo: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png', color: '#b8b8b8' }
    ];

    let lastPrices = null;
    async function fetchPrices(vs = 'usd') {
        const ids = ASSETS.map(a => a.id).join(',');
        const url = `${API}?ids=${ids}&vs_currencies=${vs}&include_24hr_change=true`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('Price API failed');
        const data = await res.json();
        lastPrices = data;
        localStorage.setItem('nv_last_prices', JSON.stringify(data));
        return data;
    }

    // Render holdings with provided or cached prices
    function renderOverviewHoldings(prices) {
        const holdings = getActiveHoldings();
        const data = prices || lastPrices || JSON.parse(localStorage.getItem('nv_last_prices') || 'null');
        if (!data) return;
        const snapshots = ASSETS.map(asset => {
            const price = data[asset.id]?.usd || 0;
            const change = data[asset.id]?.usd_24h_change || 0;
            const amount = holdings[asset.symbol] || 0;
            return { asset, price, change, amount, value: amount * price };
        });
        const total = snapshots.reduce((acc, s) => acc + s.value, 0);
        // Render asset list v2
        const assetsList = document.getElementById('assetsList');
        if (assetsList) {
            assetsList.innerHTML = '';
            snapshots.forEach(s => {
                const row = document.createElement('div');
                row.className = 'asset-list-row';
                row.innerHTML = `
                        <div class="asset-list-left">
                            <span class="asset-list-icon"><img src="${s.asset.logo}" alt="${s.asset.symbol}" /></span>
                            <span class="asset-list-name">${s.asset.name}<span class="asset-list-symbol">${s.asset.symbol}</span></span>
                        </div>
                        <div class="asset-list-right">
                            <span class="asset-list-price">${formatCurrency(s.price)}</span>
                            <span class="asset-list-balance">${formatCurrency(s.value)} (${s.amount.toFixed(4)} ${s.asset.symbol})</span>
                        </div>
                    `;
                assetsList.appendChild(row);
            });
        }
        const totalEl = document.getElementById('totalBalance');
        if (totalEl) totalEl.textContent = formatCurrency(total);
        const totalChangeChip = document.getElementById('totalChange');
        if (totalChangeChip) {
            const avgChange = snapshots.length ? (snapshots.reduce((acc, s) => acc + s.change, 0) / snapshots.length) : 0;
            totalChangeChip.textContent = (avgChange >= 0 ? '+' : '') + avgChange.toFixed(2) + '% Last 24h';
            totalChangeChip.classList.toggle('negative', avgChange < 0);
        }
    }

    function formatCurrency(value, currency = 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
    }

    function getActiveHoldings() {
        const session = JSON.parse(localStorage.getItem('nv_session') || 'null');
        if (session && session.username) {
            const key = 'nv_holdings_' + session.username;
            let h = JSON.parse(localStorage.getItem(key) || 'null');
            if (!h) {
                h = { BTC: 0, ETH: 0, SOL: 0 }; // zero start for new users
                localStorage.setItem(key, JSON.stringify(h));
            }
            return h;
        }
        // legacy fallback
        return JSON.parse(localStorage.getItem('nw_holdings') || '{}');
    }

    async function updateOverviewHoldings() {
        try {
            const data = await fetchPrices('usd');
            renderOverviewHoldings(data);
        } catch (e) {
            console.error(e);
        }
    }

    function initHoldings() {
        // legacy migration only; new users use per-user zero holdings
        const stored = JSON.parse(localStorage.getItem('nw_holdings') || 'null');
        if (stored) {
            if (stored.USDT && !stored.SOL) { stored.SOL = 0; delete stored.USDT; localStorage.setItem('nw_holdings', JSON.stringify(stored)); }
        }
    }

    function schedule() {
        const REFRESH_SECONDS = 60;
        let remaining = REFRESH_SECONDS;
        const countdownEl = document.getElementById('refreshCountdown');
        function tickCountdown() {
            remaining--;
            if (remaining <= 0) {
                remaining = REFRESH_SECONDS;
                updateOverviewHoldings();
            }
            if (countdownEl) countdownEl.textContent = `Next price refresh in: ${remaining}s`;
        }
        // initial fetch & countdown seed
        updateOverviewHoldings().then(() => {
            if (countdownEl) countdownEl.textContent = `Next price refresh in: ${remaining}s`;
        });
        setInterval(tickCountdown, 1000);
    }

    return { fetchPrices, updateOverviewHoldings, initHoldings, schedule, ASSETS, renderOverviewHoldings };
})();

window.addEventListener('DOMContentLoaded', () => {
    PriceService.initHoldings();
    // Always show last known values or a spinner immediately
    const assetsList = document.getElementById('assetsList');
    const totalEl = document.getElementById('totalBalance');
    if (assetsList && assetsList.innerHTML.trim() === '') {
        assetsList.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
    if (totalEl && totalEl.textContent === '$0.00') {
        // Try to show last cached values
        PriceService.renderOverviewHoldings();
    }
    PriceService.schedule();
});
