// script.js - interactions (clean rewrite with multi-user + zero balances + send preview + tx types)
(async function () {
    // Sidebar hamburger
    const sidebar = document.querySelector('.sidebar');
    const ham = document.querySelector('.hamburger');
    if (ham && sidebar) ham.addEventListener('click', () => sidebar.classList.toggle('open'));

    // ---------------- Auth System ----------------
    const AUTH_PAGES = ['login.html', 'signup.html'];
    const currentPage = location.pathname.split('/').pop().toLowerCase();
    const isInPages = location.pathname.includes('/pages/');

    async function sha256(text) {
        const enc = new TextEncoder().encode(text);
        const digest = await crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    function getUser() { return JSON.parse(localStorage.getItem('nv_user') || 'null'); }
    function getSession() { return JSON.parse(localStorage.getItem('nv_session') || 'null'); }
    function isAuthed() { const s = getSession(); return !!(s && s.username === (getUser()?.username)); }
    function requireAuth() {
        if (!isAuthed() && !AUTH_PAGES.includes(currentPage)) {
            location.replace(isInPages ? 'login.html' : 'pages/login.html');
        }
    }
    requireAuth();

    // ---------------- Welcome Username ----------------
    const welcomeSpan = document.getElementById('welcomeUsername');
    if (welcomeSpan) {
        const user = getSession()?.username;
        if (user) welcomeSpan.textContent = user;
    }

    // -------- Multi-user holdings & tx helpers --------
    function activeUsername() { return getSession()?.username; }
    function holdingsKey() { return `nv_holdings_${activeUsername()}`; }
    function txsKey() { return `nv_txs_${activeUsername()}`; }
    function getActiveHoldings() {
        const key = holdingsKey();
        if (!key) return { BTC: 0, ETH: 0, SOL: 0 };
        const h = JSON.parse(localStorage.getItem(key) || 'null');
        if (h) return h;
        const empty = { BTC: 0, ETH: 0, SOL: 0 }; // zero start
        localStorage.setItem(key, JSON.stringify(empty));
        return empty;
    }
    function saveActiveHoldings(h) { const key = holdingsKey(); if (key) localStorage.setItem(key, JSON.stringify(h)); }
    function getActiveTxs() { const key = txsKey(); return key ? JSON.parse(localStorage.getItem(key) || '[]') : []; }
    function saveActiveTxs(t) { const key = txsKey(); if (key) localStorage.setItem(key, JSON.stringify(t)); }

    // ---------------- Notifications ----------------
    function notify(msg, type = 'info', timeout = 4000) {
        const area = document.getElementById('notifyArea') || document.querySelector('.main');
        if (!area) return console.log('Notify:', msg);
        const div = document.createElement('div');
        div.className = `notify notify-${type} fade-in`;
        div.innerHTML = `<span>${msg}</span><button class="btn-close btn-close-white ms-2" style="font-size:10px" aria-label="Close"></button>`;
        div.querySelector('button').addEventListener('click', () => div.remove());
        area.prepend(div);
        if (timeout) setTimeout(() => { div.classList.add('fade-out'); setTimeout(() => div.remove(), 500); }, timeout);
    }

    // ---------------- Signup ----------------
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async e => {
            e.preventDefault();
            const u = signupForm.username.value.trim();
            const p = signupForm.password.value;
            const c = signupForm.confirm.value;
            if (!u || !p) return notify('Provide credentials', 'error');
            if (p !== c) return notify('Passwords do not match', 'error');
            const passHash = await sha256(p);
            localStorage.setItem('nv_user', JSON.stringify({ username: u, passHash }));
            localStorage.setItem('nv_session', JSON.stringify({ username: u, ts: Date.now() }));
            // zero holdings auto created on first access
            getActiveHoldings();
            notify('Account created', 'success');
            // Check if we're in pages folder or root
            const isInPages = location.pathname.includes('/pages/');
            location.replace(isInPages ? '../index.html' : 'index.html');
        });
    }

    // ---------------- Login ----------------
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async e => {
            e.preventDefault();
            const u = loginForm.username.value.trim();
            const p = loginForm.password.value;
            const stored = getUser();
            if (!stored) return notify('No account; sign up first', 'error');
            const passHash = await sha256(p);
            if (stored.username === u && stored.passHash === passHash) {
                localStorage.setItem('nv_session', JSON.stringify({ username: u, ts: Date.now() }));
                notify('Logged in', 'success');
                // Check if we're in pages folder or root
                const isInPages = location.pathname.includes('/pages/');
                location.replace(isInPages ? '../index.html' : 'index.html');
            } else notify('Invalid credentials', 'error');
        });
    }

    // ---------------- Logout ----------------
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('nv_session');
        // Check if we're in pages folder or root
        const isInPages = location.pathname.includes('/pages/');
        location.replace(isInPages ? 'login.html' : 'pages/login.html');
    });

    // ---------------- Send Form + Preview ----------------
    const sendForm = document.getElementById('sendForm');
    if (sendForm) {
        const amountInput = sendForm.amount;
        const assetSelect = sendForm.asset;
        const previewEl = document.getElementById('sendPreview');
        function updatePreview() {
            const holdings = getActiveHoldings();
            const asset = assetSelect.value;
            const balance = holdings[asset] || 0;
            const amt = parseFloat(amountInput.value) || 0;
            const fee = amt > 0 ? amt * 0.002 : 0;
            const total = amt + fee;
            const remaining = (balance - amt) >= 0 ? (balance - amt) : 'Insufficient';
            if (previewEl) previewEl.textContent = `Fee: ${fee.toFixed(6)} ${asset} | Total: ${total.toFixed(6)} ${asset} | Remaining: ${typeof remaining === 'number' ? remaining.toFixed(6) : remaining}`;
            const submitBtn = sendForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = (amt <= 0 || amt > balance);
        }
        amountInput.addEventListener('input', updatePreview);
        assetSelect.addEventListener('change', updatePreview);
        updatePreview();
        sendForm.addEventListener('submit', e => {
            e.preventDefault();
            const to = sendForm.recipient.value.trim();
            const amount = parseFloat(sendForm.amount.value);
            const asset = sendForm.asset.value;
            if (!to || isNaN(amount) || amount <= 0) return notify('Enter valid data', 'error');
            const fee = amount * 0.002;
            const total = amount + fee;
            const holdings = getActiveHoldings();
            const current = holdings[asset];
            if (amount > current) return notify('Insufficient balance', 'error');
            holdings[asset] = +(current - amount).toFixed(8);
            saveActiveHoldings(holdings);
            const txs = getActiveTxs();
            txs.unshift({ ts: Date.now(), to, amount, asset, fee, total, type: 'SEND' });
            saveActiveTxs(txs);
            notify(`Sent ${amount} ${asset} to ${to}. Fee: ${fee.toFixed(6)} ${asset}`, 'success');
            sendForm.reset();
            updatePreview();
            // Instantly update UI with cached prices
            if (window.PriceService && PriceService.renderOverviewHoldings) PriceService.renderOverviewHoldings();
            PriceService.updateOverviewHoldings();
        });
    }

    // ---------------- Add Funds (Deposit) ----------------
    const addFundsForm = document.getElementById('addFundsForm');
    if (addFundsForm) {
        // Preselect asset from query param if provided
        try {
            const params = new URLSearchParams(location.search);
            const pre = params.get('asset');
            if (pre && addFundsForm.asset) {
                const opt = Array.from(addFundsForm.asset.options).find(o => o.value === pre);
                if (opt) addFundsForm.asset.value = pre;
            }
        } catch (e) { /* ignore */ }
        addFundsForm.addEventListener('submit', e => {
            e.preventDefault();
            const asset = addFundsForm.asset.value;
            const amount = parseFloat(addFundsForm.amount.value);
            if (isNaN(amount) || amount <= 0) return notify('Invalid amount', 'error');
            const holdings = getActiveHoldings();
            holdings[asset] = +((holdings[asset] || 0) + amount).toFixed(8);
            saveActiveHoldings(holdings);
            const txs = getActiveTxs();
            txs.unshift({ ts: Date.now(), to: 'DEPOSIT', amount, asset, fee: 0, total: amount, type: 'DEPOSIT' });
            saveActiveTxs(txs);
            notify(`Added ${amount} ${asset} successfully`, 'success');
            addFundsForm.reset();
            // Instantly update UI with cached prices
            if (window.PriceService && PriceService.renderOverviewHoldings) PriceService.renderOverviewHoldings();
            PriceService.updateOverviewHoldings();
            // If coming from Buy shortcut, return to overview for immediate visual update
            if (location.search.includes('asset=')) {
                setTimeout(() => {
                    if (window.location.pathname.includes('/pages/')) {
                        location.replace('../index.html');
                    } else {
                        location.replace('index.html');
                    }
                }, 400);
            }
        });
    }

    // ---------------- Receive Page Address Generation ----------------
    const genAddressBtn = document.getElementById('generateAddress');
    if (genAddressBtn) {
        const addressEl = document.getElementById('walletAddress');
        const metaEl = document.getElementById('addressMeta');
        const copyBtn = document.getElementById('copyAddress');
        const qrContainer = document.getElementById('qrContainer');
        let qrcode = null;
        genAddressBtn.addEventListener('click', () => {
            const addr = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b => b.toString(16).padStart(2, '0')).join('');
            if (addressEl) addressEl.textContent = addr;
            if (metaEl) metaEl.textContent = `Length: ${addr.length} | Prefix: ${addr.startsWith('0x') ? '0x ✔' : 'None'}`;
            generateQR(addr);
        });
        if (copyBtn) copyBtn.addEventListener('click', () => {
            const text = addressEl?.textContent.trim();
            if (!text || text === 'Click Generate') return notify('Generate address first', 'error');
            navigator.clipboard.writeText(text).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.innerHTML = '<i class="fa fa-copy"></i> Copy', 1500);
            });
        });
        function generateQR(text) {
            if (!qrContainer) return;
            // Clear previous QR code
            qrContainer.innerHTML = '';
            // Check if QRCode library is available
            if (typeof QRCode !== 'undefined') {
                qrcode = new QRCode(qrContainer, {
                    text: text,
                    width: 200,
                    height: 200,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
            } else {
                qrContainer.innerHTML = '<div class="text-secondary">QR library not loaded</div>';
            }
        }
    }

    // ---------------- Transactions Page ----------------
    const txTableBody = document.getElementById('txTableBody');
    const txFilterInput = document.getElementById('txFilter');
    const txSortSelect = document.getElementById('txSort');
    const txExportBtn = document.getElementById('txExport');
    function getSortedFilteredTxs() {
        let txs = getActiveTxs();
        const filter = (txFilterInput?.value || '').trim().toLowerCase();
        if (filter) txs = txs.filter(t => t.to.toLowerCase().includes(filter));
        const mode = txSortSelect?.value || 'date-desc';
        txs.sort((a, b) => {
            switch (mode) {
                case 'date-asc': return a.ts - b.ts;
                case 'date-desc': return b.ts - a.ts;
                case 'amount-asc': return a.amount - b.amount;
                case 'amount-desc': return b.amount - a.amount;
                default: return 0;
            }
        });
        return txs;
    }
    function renderTxs() {
        if (!txTableBody) return;
        const txs = getSortedFilteredTxs();
        txTableBody.innerHTML = txs.map(tx => `<tr class="fade-in"><td>${new Date(tx.ts).toLocaleString()}</td><td>${tx.type || 'SEND'}</td><td>${tx.to}</td><td>${tx.amount} ${tx.asset}</td><td>${tx.fee.toFixed(6)} ${tx.asset}</td><td>${tx.total.toFixed(6)} ${tx.asset}</td></tr>`).join('');
    }
    function exportTxs() {
        const txs = getActiveTxs();
        const blob = new Blob([JSON.stringify(txs, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'chainpilot_transactions.json';
        a.click();
        URL.revokeObjectURL(a.href);
    }
    if (txTableBody) {
        renderTxs();
        [txFilterInput, txSortSelect].forEach(el => el && el.addEventListener('input', renderTxs));
        if (txExportBtn) txExportBtn.addEventListener('click', exportTxs);
    }

    // ---------------- Security page password strength ----------------
    const pwdInput = document.getElementById('pwd');
    const strengthBar = document.querySelector('#passwordStrength .bar');
    if (pwdInput && strengthBar) {
        pwdInput.addEventListener('input', () => {
            const v = pwdInput.value;
            const score = calcStrength(v);
            strengthBar.style.width = score + '%';
            strengthBar.style.background = score < 40 ? 'var(--accent-red)' : score < 70 ? '#ffb347' : 'var(--accent-green)';
        });
    }
    function calcStrength(p) { let s = 0; if (p.length > 7) s += 20; if (/[A-Z]/.test(p)) s += 20; if (/[0-9]/.test(p)) s += 20; if (/[^A-Za-z0-9]/.test(p)) s += 20; if (p.length > 12) s += 20; return Math.min(s, 100); }

    // ---------------- Live recipient validation ----------------
    const recipientInput = document.getElementById('recipientInput');
    const recipientInfo = document.getElementById('recipientInfo');
    if (recipientInput && recipientInfo) {
        recipientInput.addEventListener('input', () => {
            const v = recipientInput.value.trim();
            const len = v.length;
            let status = `Length: ${len}`;
            if (/^0x[a-fA-F0-9]{40}$/.test(v)) status += ' | Looks like valid ETH-style';
            else if (v.startsWith('0x')) status += ' | Invalid length (expect 42)';
            recipientInfo.textContent = status;
        });
    }

    // ---------------- Empty wallet prompt on overview ----------------
    if (document.getElementById('totalBalance')) {
        const h = getActiveHoldings();
        const empty = Object.values(h).every(v => v === 0);
        if (empty) notify('Wallet empty. Use Add Funds to deposit assets.', 'info', 6000);
    }

    // ---------------- Profile Page Logic ----------------
    const profileHoldingsBody = document.getElementById('profileHoldings');
    if (profileHoldingsBody) {
        const user = getUser();
        const session = getSession();
        const h = getActiveHoldings();
        const uEl = document.getElementById('profileUsername');
        const tsEl = document.getElementById('profileSessionTs');
        if (uEl) uEl.textContent = user?.username || '—';
        if (tsEl) tsEl.textContent = session ? new Date(session.ts).toLocaleString() : '—';
        profileHoldingsBody.innerHTML = Object.entries(h).map(([sym, amt]) => `<tr><td>${sym}</td><td>${amt}</td></tr>`).join('');
        // Password change form
        const pwdForm = document.getElementById('pwdChangeForm');
        if (pwdForm) {
            pwdForm.addEventListener('submit', async e => {
                e.preventDefault();
                const current = pwdForm.current.value;
                const next = pwdForm.next.value;
                const confirm = pwdForm.confirm.value;
                if (!current || !next) return notify('Fill all fields', 'error');
                if (next !== confirm) return notify('New passwords do not match', 'error');
                const stored = getUser();
                if (!stored) return notify('No user loaded', 'error');
                const currentHash = await sha256(current);
                if (currentHash !== stored.passHash) return notify('Current password incorrect', 'error');
                stored.passHash = await sha256(next);
                localStorage.setItem('nv_user', JSON.stringify(stored));
                notify('Password updated', 'success');
                pwdForm.reset();
            });
        }
    }

    // ---------------- Full page refresh button ----------------
    const refreshPageBtn = document.getElementById('refreshPageBtn');
    if (refreshPageBtn) refreshPageBtn.addEventListener('click', () => location.reload());
})();