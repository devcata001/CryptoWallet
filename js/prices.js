// prices.js - fetch live crypto prices
const PriceService = (() => {
    const API = 'https://api.coingecko.com/api/v3/simple/price';
    const ASSETS = [
        { id: 'bitcoin', symbol: 'BTC', color: '#f7931a' },
        { id: 'ethereum', symbol: 'ETH', color: '#6d38ff' },
        { id: 'solana', symbol: 'SOL', color: '#00ffa3' }
    ];

    async function fetchPrices(vs = 'usd') {
        const ids = ASSETS.map(a => a.id).join(',');
        const url = `${API}?ids=${ids}&vs_currencies=${vs}&include_24hr_change=true`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('Price API failed');
        return res.json();
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
        const holdings = getActiveHoldings();
        try {
            const data = await fetchPrices('usd');
            const snapshots = ASSETS.map(asset => {
                const price = data[asset.id].usd;
                const change = data[asset.id].usd_24h_change;
                const amount = holdings[asset.symbol] || 0;
                return { asset, price, change, amount, value: amount * price };
            });
            const total = snapshots.reduce((acc, s) => acc + s.value, 0);
            snapshots.forEach(s => {
                const row = document.querySelector(`.asset-row[data-symbol="${s.asset.symbol}"]`);
                if (row) {
                    row.querySelector('.asset-amount').textContent = s.amount.toFixed(4) + ' ' + s.asset.symbol;
                    row.querySelector('.asset-value').textContent = formatCurrency(s.value);
                    const allocEl = row.querySelector('.asset-allocation');
                    if (allocEl) allocEl.textContent = total ? ((s.value / total) * 100).toFixed(1) + '%' : '0%';
                    const changeEl = row.querySelector('.asset-change');
                    changeEl.textContent = (s.change >= 0 ? '+' : '') + s.change.toFixed(2) + '%';
                    changeEl.classList.toggle('positive', s.change >= 0);
                    changeEl.classList.toggle('negative', s.change < 0);
                }
            });
            const totalEl = document.getElementById('totalBalance');
            if (totalEl) totalEl.textContent = formatCurrency(total);
            const totalChangeChip = document.getElementById('totalChange');
            if (totalChangeChip) {
                const avgChange = snapshots.reduce((acc, s) => acc + s.change, 0) / snapshots.length;
                totalChangeChip.textContent = (avgChange >= 0 ? '+' : '') + avgChange.toFixed(2) + '% Last 24h';
                totalChangeChip.classList.toggle('negative', avgChange < 0);
            }
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

    return { fetchPrices, updateOverviewHoldings, initHoldings, schedule, ASSETS };
})();

window.addEventListener('DOMContentLoaded', () => {
    PriceService.initHoldings();
    PriceService.schedule();
});
