// auth.js — Modul Autentikasi v3.0 (Auto-load Firebase Config dari Database)
const Auth = {
    currentUser: null,
    SESSION_TIMEOUT: 8 * 60 * 60 * 1000,
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION: 5 * 60 * 1000,

    _akunMaster: {
        "adly": { username: "adly", nama: "Adly Owner", role: "Owner", level: "admin", pass: "MTIzNDU=" },
        "kepala_toko1": { username: "kepala_toko1", nama: "Kaprul Toko 1", role: "Supervisor", level: "supervisor", pass: "MTIzNDU=" },
        "kasir1": { username: "kasir1", nama: "Siti Kasir 1", role: "Kasir", level: "kasir", pass: "MTIzNDU=" }
    },

    // 1. INIT — Load config dari DB, lalu cek sesi
    async init() {
        // LANGKAH 1: Load config Firebase dari database
        let firebaseReady = false;
        if (typeof FirebaseConfigManager !== 'undefined') {
            const hasConfig = await FirebaseConfigManager.init();
            if (hasConfig && typeof firebase !== 'undefined') {
                try {
                    const config = FirebaseConfigManager.getConfig();
                    if (config && !firebase.apps.length) {
                        firebase.initializeApp(config);
                        console.log("✅ Firebase diinisialisasi dari database config");
                    }
                    firebaseReady = firebase.apps.length > 0;
                } catch (e) {
                    console.error("❌ Gagal inisialisasi Firebase:", e);
                    firebaseReady = false;
                }
            }
        }

        // LANGKAH 2: Cek sesi login
        const sessionData = localStorage.getItem('kasirPro_session');
        if (!sessionData) { 
            this.tampilkanLogin(); 
            this.updateLoginModeUI(false); 
            return; 
        }

        try {
            const parsed = JSON.parse(sessionData);
            
            // Cek sesi Firebase
            if (parsed.type === 'firebase') {
                if (!firebaseReady) {
                    this.logout("Firebase tidak tersedia. Silakan setup config terlebih dahulu.");
                    return;
                }
                const verified = await FirebaseAuth.checkSession();
                if (!verified) { 
                    this.logout("Sesi Firebase kedaluwarsa."); 
                    return; 
                }
                this.currentUser = verified;
                this.applyRoleUI(); 
                this.tampilkanApp(); 
                setTimeout(() => { if (typeof bukaTab === 'function') bukaTab('tab-kasir'); }, 100);
                return;
            }

            // Cek sesi lokal
            if (!parsed.token || !parsed.user) throw new Error("Sesi rusak");

            const expectedToken = btoa(parsed.user.username + ":" + parsed.user.role + ":" + parsed.timestamp + ":" + this._getSecret());
            if (parsed.token !== expectedToken) throw new Error("Token tidak valid");

            if (Date.now() - parsed.timestamp > this.SESSION_TIMEOUT) { 
                this.logout("Sesi berakhir."); 
                return; 
            }

            this.currentUser = parsed.user;
            this.applyRoleUI();
            this.tampilkanApp();
            setTimeout(() => { if (typeof bukaTab === 'function') bukaTab('tab-kasir'); }, 100);

            setTimeout(() => {
                if (typeof Stok !== 'undefined' && Stok.renderMasterBarang) Stok.renderMasterBarang();
            }, 500);
        } catch (e) { 
            this.logout("Sesi error."); 
        }
    },

    _getSecret() { return "kasirpro_secret_v2_2026"; },

    // 2. UPDATE UI MODE LOGIN (Firebase vs Local)
    updateLoginModeUI(firebaseReady) {
        const indicator = document.getElementById('loginModeIndicator');
        const emailWrapper = document.getElementById('emailFieldWrapper');
        const helpText = document.getElementById('loginHelpText');

        if (!indicator) return;

        if (firebaseReady) {
            indicator.style.background = '#e3f2fd'; 
            indicator.style.color = '#1565c0';
            indicator.textContent = '🔐 Mode: Firebase Auth (Cloud)';
            if (emailWrapper) emailWrapper.style.display = 'block';
            if (helpText) helpText.textContent = 'Gunakan email & password akun Firebase resmi';
        } else {
            indicator.style.background = '#fff3e0'; 
            indicator.style.color = '#e65100';
            indicator.textContent = '📦 Mode: Local DB (Setup Firebase di menu Owner)';
            if (emailWrapper) emailWrapper.style.display = 'none';
            if (helpText) helpText.textContent = 'Gunakan username lokal (contoh: adly)';
        }
    },

    // 3. LOGIN
    async login() {
        const usernameEl = document.getElementById('loginUsername');
        const passwordEl = document.getElementById('loginPassword');
        if (!usernameEl || !passwordEl) return;

        const username = usernameEl.value.trim().toLowerCase();
        const password = passwordEl.value;
        if (!username || !password) { alert("❌ Isi Username & Password!"); return; }

        try {
            let karyawan = this._akunMaster[username];
            if (!karyawan && typeof DB !== 'undefined' && DB.instance) {
                karyawan = await DB.get("karyawan", username);
            }

            if (!karyawan || karyawan.pass !== btoa(password)) { 
                alert("❌ Kredensial Salah!"); 
                return; 
            }

            let roleFinal = 'Kasir';
            if (karyawan.role === 'Owner' || karyawan.level === 'admin') roleFinal = 'Owner';
            if (karyawan.role === 'Supervisor' || karyawan.level === 'supervisor') roleFinal = 'Supervisor';

            const userData = { 
                username: karyawan.username, 
                nama: karyawan.nama, 
                role: roleFinal, 
                type: 'local' 
            };
            const timestamp = Date.now();
            const token = btoa(userData.username + ":" + userData.role + ":" + timestamp + ":" + this._getSecret());

            localStorage.setItem('kasirPro_session', JSON.stringify({ 
                type: 'local', 
                user: userData, 
                token, 
                timestamp 
            }));
            this.currentUser = userData;

            const lbl = document.getElementById('labelKasirAktif');
            if (lbl) lbl.textContent = '👤 ' + userData.nama;

            this.applyRoleUI();
            this.tampilkanApp();

            usernameEl.value = ''; 
            passwordEl.value = '';
            if (typeof bukaTab === 'function') bukaTab('tab-kasir');
        } catch (e) { 
            alert("Gagal masuk."); 
        }
    },

    // 4. LOGOUT
    logout(p = "Anda telah logout.") {
        localStorage.removeItem('kasirPro_session'); 
        this.currentUser = null;
        alert(p); 
        window.location.replace(window.location.href);
    },

    // 5. ROLE CHECK
    isOwner() { return this.currentUser && this.currentUser.role === 'Owner'; },
    isSupervisor() { return this.currentUser && this.currentUser.role === 'Supervisor'; },
    isKasir() { return this.currentUser && this.currentUser.role === 'Kasir'; },

    // 6. CHECK ACCESS
    checkAccess(tabId) {
        const semuaLevelTabs = ['tab-kasir', 'tab-master', 'tab-patroli', 'tab-request'];
        
        if (this.isOwner()) return true;

        if (this.isSupervisor() || this.isKasir()) {
            if (semuaLevelTabs.includes(tabId)) {
                return true;
            }
            alert("⛔ Akses Ditolak! Menu ini dikunci khusus untuk Owner Utama.");
            return false;
        }
        return false;
    },

    // 7. APPLY ROLE UI
    applyRoleUI() {
        document.querySelectorAll('.owner-only').forEach(el => el.classList.add('hidden'));

        const btnMaster = document.getElementById('nav-master');

        if (this.isOwner()) {
            document.querySelectorAll('.owner-only').forEach(el => el.classList.remove('hidden'));
            if (btnMaster) {
                btnMaster.classList.remove('hidden');
                btnMaster.classList.add('owner-only');
            }
        } else if (this.isSupervisor() || this.isKasir()) {
            if (btnMaster) {
                btnMaster.classList.remove('hidden');
                btnMaster.classList.remove('owner-only');
            }
        }
    },

    // 8. TAMPILKAN LOGIN / APP
    tampilkanLogin() {
        const lg = document.getElementById('halaman-login'); 
        const ap = document.getElementById('konten-aplikasi');
        if (lg) lg.style.display = 'flex'; 
        if (ap) ap.classList.add('hidden');
    },
    
    tampilkanApp() {
        const lg = document.getElementById('halaman-login'); 
        const ap = document.getElementById('konten-aplikasi');
        if (lg) lg.style.display = 'none'; 
        if (ap) ap.classList.remove('hidden');
    }
};
