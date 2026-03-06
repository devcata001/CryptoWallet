/* ── Nova Wallet – Web3 Engine ───────────────────────────────────────
 *  Dependencies (loaded via CDN before this file):
 *    • ethers v6  → window.ethers
 *    • tweetnacl  → window.nacl
 * ─────────────────────────────────────────────────────────────────── */
'use strict';

var NW = (() => {

    /* ══ CONSTANTS ════════════════════════════════════════════════════ */
    const RPC = {
        ETH: 'https://eth.llamarpc.com',
        BNB: 'https://bsc-dataseed.binance.org',
        SOL: 'https://api.mainnet-beta.solana.com',
    };

    const PATHS = {
        ETH: "m/44'/60'/0'/0/0",
        BNB: "m/44'/60'/0'/0/0",
        BTC: "m/84'/0'/0'/0/0",
        SOL: "m/44'/501'/0'/0'",
    };

    const ERC20 = {
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    };

    const BEP20 = {
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    };

    const TOKEN_ABI = [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function transfer(address,uint256) returns (bool)',
    ];

    /* ══ BYTE HELPERS ═════════════════════════════════════════════════ */
    const toHex = b => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
    const fromHex = h => new Uint8Array(h.match(/.{2}/g).map(x => parseInt(x, 16)));

    /* ══ RIPEMD-160 (pure JS, needed for BTC hash160) ════════════════ */
    function ripemd160(msg) {
        const K = [0, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E];
        const KK = [0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0];
        const SL = [
            [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
            [7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12],
            [11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5],
            [11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12],
            [9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6],
        ];
        const SR = [
            [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6],
            [9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11],
            [9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5],
            [15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8],
            [8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11],
        ];
        const RL = [
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            [7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8],
            [3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12],
            [1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2],
            [4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13],
        ];
        const RR = [
            [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12],
            [6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2],
            [15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13],
            [8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14],
            [12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11],
        ];
        const F = [
            (x, y, z) => (x ^ y ^ z),
            (x, y, z) => ((x & y) | (~x & z)),
            (x, y, z) => ((x | (~y)) ^ z),
            (x, y, z) => ((x & z) | (y & ~z)),
            (x, y, z) => (x ^ (y | (~z))),
        ];
        const rol = (x, n) => ((x << n) | (x >>> (32 - n))) | 0;

        const len = msg.length;
        const padLen = 64 - ((len + 9) % 64 || 64);
        const padded = new Uint8Array(len + 9 + padLen);
        padded.set(msg);
        padded[len] = 0x80;
        const dv = new DataView(padded.buffer);
        dv.setUint32(padded.length - 8, (len * 8) >>> 0, true);
        dv.setUint32(padded.length - 4, Math.floor(len / 0x20000000), true);

        let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;

        for (let i = 0; i < padded.length; i += 64) {
            const X = Array.from({ length: 16 }, (_, j) => dv.getUint32(i + j * 4, true));
            let al = h0, bl = h1, cl = h2, dl = h3, el = h4;
            let ar = h0, br = h1, cr = h2, dr = h3, er = h4;
            for (let r = 0; r < 5; r++) {
                for (let j = 0; j < 16; j++) {
                    let t = rol(((al + F[r](bl, cl, dl)) | 0) + X[RL[r][j]] + K[r], SL[r][j]);
                    t = (t + el) | 0; al = el; el = dl; dl = rol(cl, 10); cl = bl; bl = t;
                    t = rol(((ar + F[4 - r](br, cr, dr)) | 0) + X[RR[r][j]] + KK[r], SR[r][j]);
                    t = (t + er) | 0; ar = er; er = dr; dr = rol(cr, 10); cr = br; br = t;
                }
            }
            const t = (h1 + cl + dr) | 0;
            h1 = (h2 + dl + er) | 0; h2 = (h3 + el + ar) | 0; h3 = (h4 + al + br) | 0; h4 = (h0 + bl + cr) | 0; h0 = t;
        }
        const out = new Uint8Array(20);
        const ov = new DataView(out.buffer);
        [h0, h1, h2, h3, h4].forEach((h, i) => ov.setUint32(i * 4, h, true));
        return out;
    }

    /* ══ BECH32 (BTC P2WPKH address) ═════════════════════════════════ */
    const B32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    const B32G = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

    function b32Polymod(v) {
        let c = 1;
        for (const x of v) {
            const b = c >> 25;
            c = ((c & 0x1ffffff) << 5) ^ x;
            for (let i = 0; i < 5; i++) if ((b >> i) & 1) c ^= B32G[i];
        }
        return c;
    }
    function b32Expand(hrp) {
        return [...hrp.split('').map(c => c.charCodeAt(0) >> 5), 0,
        ...hrp.split('').map(c => c.charCodeAt(0) & 31)];
    }
    function cvtBits(data, from, to) {
        let acc = 0, bits = 0;
        const r = [];
        for (const v of data) {
            acc = (acc << from) | v; bits += from;
            while (bits >= to) { bits -= to; r.push((acc >> bits) & ((1 << to) - 1)); }
        }
        if (bits > 0) r.push((acc << (to - bits)) & ((1 << to) - 1));
        return r;
    }
    function bech32Encode(hrp, ver, prog) {
        const data = [ver, ...cvtBits(prog, 8, 5)];
        const vals = [...b32Expand(hrp), ...data, 0, 0, 0, 0, 0, 0];
        const mod = b32Polymod(vals) ^ 1;
        const chk = Array.from({ length: 6 }, (_, i) => (mod >> (5 * (5 - i))) & 31);
        return hrp + '1' + [...data, ...chk].map(x => B32[x]).join('');
    }

    /* ══ BASE-58 (SOL address encode/decode) ═════════════════════════ */
    const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

    function bs58Encode(bytes) {
        let n = 0n;
        for (const b of bytes) n = n * 256n + BigInt(b);
        let s = '';
        while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
        for (const b of bytes) { if (b) break; s = '1' + s; }
        return s;
    }

    function bs58Decode(str) {
        let n = 0n;
        for (const c of str) { n = n * 58n + BigInt(B58.indexOf(c)); }
        let hex = n.toString(16);
        if (hex.length % 2) hex = '0' + hex;
        let leading = 0;
        for (const c of str) { if (c === '1') leading++; else break; }
        const body = fromHex(hex);
        const result = new Uint8Array(leading + body.length);
        result.set(body, leading);
        // Normalise to 32 bytes for Solana account keys
        if (result.length < 32) { const p = new Uint8Array(32); p.set(result, 32 - result.length); return p; }
        return result.slice(0, 32);
    }

    /* ══ BIP39 MNEMONIC → 64-BYTE SEED (PBKDF2-HMAC-SHA512) ══════════ */
    async function mnemonicToSeed(phrase) {
        const mn = new TextEncoder().encode(phrase.normalize('NFKD'));
        const sal = new TextEncoder().encode('mnemonic');
        const km = await crypto.subtle.importKey('raw', mn, 'PBKDF2', false, ['deriveBits']);
        return new Uint8Array(await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt: sal, iterations: 2048, hash: 'SHA-512' }, km, 512
        ));
    }

    /* ══ SLIP-0010 ED25519 DERIVATION (for Solana) ════════════════════ */
    async function deriveEd25519(seed, path) {
        const MASTER = new TextEncoder().encode('ed25519 seed');
        const mk = await crypto.subtle.importKey('raw', MASTER, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
        let I = new Uint8Array(await crypto.subtle.sign('HMAC', mk, seed));
        let kL = I.slice(0, 32), kR = I.slice(32);
        for (const seg of path.split('/').slice(1)) {
            const h = seg.endsWith("'");
            const idx = (parseInt(h ? seg.slice(0, -1) : seg) + (h ? 0x80000000 : 0)) >>> 0;
            const data = new Uint8Array(37);
            data[0] = 0x00; data.set(kL, 1);
            new DataView(data.buffer).setUint32(33, idx, false);
            const ck = await crypto.subtle.importKey('raw', kR, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
            I = new Uint8Array(await crypto.subtle.sign('HMAC', ck, data));
            kL = I.slice(0, 32); kR = I.slice(32);
        }
        return kL;
    }

    /* ══ HASH160 for BTC (SHA-256 → RIPEMD-160) ═════════════════════ */
    async function hash160(pubKey) {
        return ripemd160(new Uint8Array(await crypto.subtle.digest('SHA-256', pubKey)));
    }

    /* ══ SOLANA TRANSACTION BUILDER ══════════════════════════════════ */
    function buildSolTransfer(fromAddr, toAddr, lamports, blockhash) {
        const cu16 = n => n < 0x80 ? [n] : [0x80 | (n & 0x7f), n >> 7];
        const from32 = bs58Decode(fromAddr);
        const to32 = bs58Decode(toAddr);
        const sys32 = new Uint8Array(32); // SystemProgram = all zeros
        const bh32 = bs58Decode(blockhash);

        const instrData = new Uint8Array(12);
        const dv = new DataView(instrData.buffer);
        dv.setUint32(0, 2, true); // SystemProgram::Transfer = opcode 2
        const lamps = BigInt(lamports);
        dv.setUint32(4, Number(lamps & 0xffffffffn), true);
        dv.setUint32(8, Number(lamps >> 32n), true);

        return new Uint8Array([
            // Header: 1 required sig, 0 readonly-signed, 1 readonly-unsigned
            1, 0, 1,
            ...cu16(3),                  // 3 account keys
            ...from32, ...to32, ...sys32,
            ...bh32,                     // recent blockhash
            ...cu16(1),                  // 1 instruction
            2,                           // program_id index = 2 (SystemProgram)
            ...cu16(2), 0, 1,            // 2 accounts: from(0), to(1)
            ...cu16(instrData.length), ...instrData,
        ]);
    }

    /* ══ PUBLIC API ═══════════════════════════════════════════════════ */
    return {

        /* ── Mnemonic ───────────────────────────────────────────────── */
        generateMnemonic() {
            return ethers.Mnemonic.entropyToPhrase(ethers.randomBytes(16)); // 128-bit → 12 words
        },
        validateMnemonic(phrase) {
            try { return !!ethers.Mnemonic.fromPhrase(phrase.trim()); } catch { return false; }
        },

        /* ── Address Derivation ──────────────────────────────────────── */
        deriveEVMWallet(phrase) {
            const w = ethers.HDNodeWallet.fromPhrase(phrase.trim(), null, PATHS.ETH);
            return { address: w.address, privateKey: w.privateKey };
        },

        async deriveBTCAddress(phrase) {
            const node = ethers.HDNodeWallet.fromPhrase(phrase.trim(), null, PATHS.BTC);
            const h160 = await hash160(ethers.getBytes(node.publicKey));
            return bech32Encode('bc', 0, h160);
        },

        async deriveSolAddress(phrase) {
            const seed = await mnemonicToSeed(phrase.trim());
            const privKey = await deriveEd25519(seed, PATHS.SOL);
            const kp = nacl.sign.keyPair.fromSeed(privKey);
            return { address: bs58Encode(kp.publicKey), secretKeyHex: toHex(kp.secretKey) };
        },

        async deriveAllAddresses(phrase) {
            const evm = this.deriveEVMWallet(phrase);
            const [btc, sol] = await Promise.all([
                this.deriveBTCAddress(phrase),
                this.deriveSolAddress(phrase),
            ]);
            return {
                evmAddress: evm.address,
                btcAddress: btc,
                solAddress: sol.address,
                privateKeyEVM: evm.privateKey,
                solSecretHex: sol.secretKeyHex,
            };
        },

        /* ── Balance Fetching ────────────────────────────────────────── */
        async getETHBalances(address) {
            const provider = new ethers.JsonRpcProvider(RPC.ETH);
            const results = { ETH: 0, USDT: 0, USDC: 0 };
            try {
                const fetches = [
                    provider.getBalance(address),
                    ...Object.entries(ERC20).map(([, ca]) => Promise.all([
                        new ethers.Contract(ca, TOKEN_ABI, provider).balanceOf(address),
                        new ethers.Contract(ca, TOKEN_ABI, provider).decimals(),
                    ])),
                ];
                const settled = await Promise.allSettled(fetches);
                if (settled[0].status === 'fulfilled')
                    results.ETH = Number(ethers.formatEther(settled[0].value));
                Object.keys(ERC20).forEach((sym, i) => {
                    const r = settled[i + 1];
                    if (r.status === 'fulfilled') {
                        const [bal, dec] = r.value;
                        results[sym] = Number(ethers.formatUnits(bal, dec));
                    }
                });
            } catch (_) { }
            return results;
        },

        async getBNBBalances(address) {
            const provider = new ethers.JsonRpcProvider(RPC.BNB);
            const results = { BNB: 0 };
            try {
                results.BNB = Number(ethers.formatEther(await provider.getBalance(address)));
            } catch (_) { }
            return results;
        },

        async getSOLBalance(address) {
            try {
                const r = await fetch(RPC.SOL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
                    signal: AbortSignal.timeout(8000),
                });
                return ((await r.json()).result?.value ?? 0) / 1e9;
            } catch { return 0; }
        },

        async getBTCBalance(address) {
            try {
                const r = await fetch(`https://blockstream.info/api/address/${address}`,
                    { signal: AbortSignal.timeout(8000) });
                const d = await r.json();
                return (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8;
            } catch { return 0; }
        },

        async fetchAllBalances(addresses) {
            const [eth, bnb, sol, btc] = await Promise.allSettled([
                this.getETHBalances(addresses.evmAddress),
                this.getBNBBalances(addresses.evmAddress),
                this.getSOLBalance(addresses.solAddress),
                this.getBTCBalance(addresses.btcAddress),
            ]);
            return {
                ETH: eth.status === 'fulfilled' ? eth.value.ETH : 0,
                USDT: eth.status === 'fulfilled' ? eth.value.USDT : 0,
                USDC: eth.status === 'fulfilled' ? eth.value.USDC : 0,
                BNB: bnb.status === 'fulfilled' ? bnb.value.BNB : 0,
                SOL: sol.status === 'fulfilled' ? sol.value : 0,
                BTC: btc.status === 'fulfilled' ? btc.value : 0,
            };
        },

        /* ── Gas Estimation ─────────────────────────────────────────── */
        async estimateFee(sym) {
            const rpc = sym === 'BNB' ? RPC.BNB : RPC.ETH;
            try {
                const provider = new ethers.JsonRpcProvider(rpc);
                const fee = await provider.getFeeData();
                const gas = fee.gasPrice || fee.maxFeePerGas || 0n;
                const limit = ['USDT', 'USDC'].includes(sym) ? 65000n : 21000n;
                return Number(ethers.formatEther(gas * limit));
            } catch { return 0; }
        },

        /* ── Transaction Sending ────────────────────────────────────── */
        async sendETH(privateKey, toAddr, amount) {
            const provider = new ethers.JsonRpcProvider(RPC.ETH);
            const wallet = new ethers.Wallet(privateKey, provider);
            const tx = await wallet.sendTransaction({
                to: toAddr, value: ethers.parseEther(String(amount)),
            });
            return tx.hash;
        },

        async sendBNB(privateKey, toAddr, amount) {
            const provider = new ethers.JsonRpcProvider(RPC.BNB);
            const wallet = new ethers.Wallet(privateKey, provider);
            const tx = await wallet.sendTransaction({
                to: toAddr, value: ethers.parseEther(String(amount)),
            });
            return tx.hash;
        },

        async sendToken(privateKey, toAddr, amount, sym) {
            // Determine chain by symbol (USDT/USDC go via ETH; _BEP20 suffix → BSC)
            const isBEP = sym.endsWith('_BEP20');
            const base = sym.replace('_BEP20', '');
            const ca = isBEP ? BEP20[base] : ERC20[base];
            if (!ca) throw new Error('Unknown token: ' + sym);
            const rpc = isBEP ? RPC.BNB : RPC.ETH;
            const provider = new ethers.JsonRpcProvider(rpc);
            const wallet = new ethers.Wallet(privateKey, provider);
            const contract = new ethers.Contract(ca, TOKEN_ABI, wallet);
            const decimals = await contract.decimals();
            const tx = await contract.transfer(toAddr, ethers.parseUnits(String(amount), decimals));
            return tx.hash;
        },

        async sendSOL(secretKeyHex, toAddr, amountSOL) {
            const lamports = Math.round(amountSOL * 1e9);
            const secretKey = fromHex(secretKeyHex);           // 64 bytes
            const fromAddr = bs58Encode(secretKey.slice(32)); // public key

            // Fetch recent blockhash
            const bhRes = await fetch(RPC.SOL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash',
                    params: [{ commitment: 'confirmed' }]
                }),
                signal: AbortSignal.timeout(10000),
            });
            const { result: bhResult } = await bhRes.json();
            const blockhash = bhResult.value.blockhash;

            // Build, sign, serialize
            const message = buildSolTransfer(fromAddr, toAddr, lamports, blockhash);
            const signature = nacl.sign.detached(message, secretKey);
            const txBytes = new Uint8Array([1, ...signature, ...message]);
            const txB64 = btoa(String.fromCharCode(...txBytes));

            // Broadcast
            const sendRes = await fetch(RPC.SOL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0', id: 1, method: 'sendTransaction',
                    params: [txB64, { encoding: 'base64', preflightCommitment: 'confirmed' }]
                }),
                signal: AbortSignal.timeout(30000),
            });
            const { result: txHash, error } = await sendRes.json();
            if (error) throw new Error(error.message || 'SOL transaction failed');
            return txHash;
        },

        /* ── Secure Session Key Store ────────────────────────────────── */
        async storeWalletSession(phrase, encKeyHex) {
            const addresses = await this.deriveAllAddresses(phrase);
            const key = await crypto.subtle.importKey('raw', fromHex(encKeyHex),
                { name: 'AES-GCM' }, false, ['encrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
                new TextEncoder().encode(JSON.stringify(addresses)));
            sessionStorage.setItem('nv_w', toHex(iv) + ':' + btoa(String.fromCharCode(...new Uint8Array(enc))));
            return addresses;
        },

        async loadWalletSession(encKeyHex) {
            const stored = sessionStorage.getItem('nv_w');
            if (!stored) return null;
            try {
                const key = await crypto.subtle.importKey('raw', fromHex(encKeyHex),
                    { name: 'AES-GCM' }, false, ['decrypt']);
                const colonAt = stored.indexOf(':');
                const iv = fromHex(stored.slice(0, colonAt));
                const data = Uint8Array.from(atob(stored.slice(colonAt + 1)), c => c.charCodeAt(0));
                const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
                return JSON.parse(new TextDecoder().decode(dec));
            } catch { return null; }
        },

        /* ── Init from encrypted SRP in localStorage ─────────────────── */
        async initFromSRP(encKeyHex) {
            // Check session cache first
            const cached = await this.loadWalletSession(encKeyHex);
            if (cached) return cached;

            const stored = localStorage.getItem('nv_srp') || '';
            if (!stored || !encKeyHex) return null;

            const key = await crypto.subtle.importKey('raw', fromHex(encKeyHex),
                { name: 'AES-GCM' }, false, ['decrypt']);
            const colonAt = stored.indexOf(':');
            const iv = fromHex(stored.slice(0, colonAt));
            const data = Uint8Array.from(atob(stored.slice(colonAt + 1)), c => c.charCodeAt(0));
            const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
            const words = JSON.parse(new TextDecoder().decode(dec));
            const phrase = Array.isArray(words) ? words.join(' ') : words;
            return await this.storeWalletSession(phrase, encKeyHex);
        },

        /* ── Explorer URL helper ─────────────────────────────────────── */
        explorerUrl(txHash, sym) {
            if (!txHash) return null;
            if (sym === 'SOL') return `https://solscan.io/tx/${txHash}`;
            if (sym === 'BNB') return `https://bscscan.com/tx/${txHash}`;
            if (sym === 'BTC') return `https://blockstream.info/tx/${txHash}`;
            return `https://etherscan.io/tx/${txHash}`;
        },
    };
})();
