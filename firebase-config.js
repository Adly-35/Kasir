// firebase-config.js — Manajemen Konfigurasi Firebase v2.0 (Load dari Database, Tidak Hardcoded)
const FirebaseConfigManager = {
    // TIDAK ADA DEFAULT CONFIG LAGI — semua load dari database
    currentConfig: null,

    // 1. LOAD CONFIG DARI DATABASE
    async loadConfig() {
        try {
            // Coba ambil dari IndexedDB
            const configData = await DB.getConfig("firebase");
            
            if (configData && configData.nilai) {
                this.currentConfig = configData.nilai;
                console.log("✅ Config Firebase loaded dari database");
                return this.currentConfig;
            }

            // Jika tidak ada di DB, coba localStorage (migrasi lama)
            const legacyConfig = localStorage.getItem('kasirpro_firebase_config');
            if (legacyConfig) {
                const parsed = JSON.parse(legacyConfig);
                // Pindahkan ke database
                await DB.saveConfig("firebase", parsed);
                localStorage.removeItem('kasirpro_firebase_config'); // Hapus legacy
                this.currentConfig = parsed;
                console.log("✅ Config dimigrasi dari localStorage ke database");
                return this.currentConfig;
            }

            console.log("⚠️ Config Firebase belum tersedia");
            return null;
        } catch (e) {
            console.error("❌ Gagal load config:", e);
            return null;
        }
    },

    // 2. SIMPAN CONFIG KE DATABASE
    async saveConfig(configObj) {
        if (!configObj || !configObj.apiKey || !configObj.databaseURL || !configObj.projectId) {
            alert("❌ Config tidak lengkap! API Key, Database URL, dan Project ID wajib diisi.");
            return false;
        }

        try {
            // Simpan ke IndexedDB
            await DB.saveConfig("firebase", configObj);
            this.currentConfig = configObj;

            // Hapus dari localStorage (tidak dipakai lagi)
            localStorage.removeItem('kasirpro_firebase_config');
            localStorage.removeItem('kasirpro_firebase_active');

            console.log("✅ Config Firebase disimpan ke database");
            return true;
        } catch (e) {
            console.error("❌ Gagal simpan config:", e);
            alert("❌ Gagal menyimpan config: " + e.message);
            return false;
        }
    },

    // 3. HAPUS CONFIG (RESET)
    async deleteConfig() {
        try {
            await DB.deleteConfig("firebase");
            this.currentConfig = null;
            localStorage.removeItem('kasirpro_firebase_config');
            localStorage.removeItem('kasirpro_firebase_active');
            console.log("🗑️ Config Firebase dihapus");
            return true;
        } catch (e) {
            console.error("❌ Gagal hapus config:", e);
            return false;
        }
    },

    // 4. CEK CONFIG TERSEDIA
    hasConfig() {
        return this.currentConfig !== null && 
               this.currentConfig.apiKey && 
               this.currentConfig.databaseURL && 
               this.currentConfig.projectId;
    },

    // 5. GET CONFIG OBJECT (untuk firebase.initializeApp)
    getConfig() {
        return this.currentConfig;
    },

    // 6. GET CONFIG STRING (untuk tampilan)
    getConfigString() {
        if (!this.currentConfig) return null;
        return JSON.stringify(this.currentConfig, null, 2);
    },

    // 7. UPDATE UI BERDASARKAN STATUS CONFIG
    updateUI() {
        const statusBadge = document.getElementById('fbStatusBadge');
        const statusText = document.getElementById('fbStatusText');
        const apiKeyEl = document.getElementById('fbApiKey');
        const authDomainEl = document.getElementById('fbAuthDomain');
        const databaseURLEl = document.getElementById('fbDatabaseURL');
        const projectIdEl = document.getElementById('fbProjectId');
        const storageBucketEl = document.getElementById('fbStorageBucket');
        const appIdEl = document.getElementById('fbAppId');

        if (this.hasConfig()) {
            // Config tersedia — tampilkan di form
            if (statusBadge) {
                statusBadge.textContent = 'AKTIF';
                statusBadge.style.background = '#4CAF50';
            }
            if (statusText) {
                statusText.textContent = '✅ Config Firebase aktif dan tersimpan di database';
                statusText.style.background = '#e8f5e9';
                statusText.style.color = '#2e7d32';
            }

            // Isi form dengan config yang ada
            if (apiKeyEl) apiKeyEl.value = this.currentConfig.apiKey || '';
            if (authDomainEl) authDomainEl.value = this.currentConfig.authDomain || '';
            if (databaseURLEl) databaseURLEl.value = this.currentConfig.databaseURL || '';
            if (projectIdEl) projectIdEl.value = this.currentConfig.projectId || '';
            if (storageBucketEl) storageBucketEl.value = this.currentConfig.storageBucket || '';
            if (appIdEl) appIdEl.value = this.currentConfig.appId || '';
        } else {
            // Config belum ada
            if (statusBadge) {
                statusBadge.textContent = 'BELUM SETUP';
                statusBadge.style.background = '#FF9800';
            }
            if (statusText) {
                statusText.textContent = '⚠️ Config Firebase belum diatur. Silakan isi form di bawah.';
                statusText.style.background = '#fff3e0';
                statusText.style.color = '#e65100';
            }
        }
    },

    // 8. SIMPAN DARI FORM UI
    async saveFromForm() {
        const apiKey = document.getElementById('fbApiKey')?.value?.trim();
        const authDomain = document.getElementById('fbAuthDomain')?.value?.trim();
        const databaseURL = document.getElementById('fbDatabaseURL')?.value?.trim();
        const projectId = document.getElementById('fbProjectId')?.value?.trim();
        const storageBucket = document.getElementById('fbStorageBucket')?.value?.trim();
        const appId = document.getElementById('fbAppId')?.value?.trim();

        if (!apiKey || !databaseURL || !projectId) {
            alert("❌ API Key, Database URL, dan Project ID wajib diisi!");
            return;
        }

        const configObj = {
            apiKey: apiKey,
            authDomain: authDomain || '',
            databaseURL: databaseURL,
            projectId: projectId,
            storageBucket: storageBucket || '',
            appId: appId || ''
        };

        const saved = await this.saveConfig(configObj);
        if (saved) {
            this.updateUI();
            alert("✅ Config Firebase berhasil disimpan ke database!\\n\\nSilakan refresh halaman untuk mengaktifkan koneksi Firebase.");
        }
    },

    // 9. TEST KONEKSI DARI FORM
    async testFromForm() {
        const apiKey = document.getElementById('fbApiKey')?.value?.trim();
        const databaseURL = document.getElementById('fbDatabaseURL')?.value?.trim();
        const projectId = document.getElementById('fbProjectId')?.value?.trim();

        if (!apiKey || !databaseURL || !projectId) {
            alert("❌ Isi API Key, Database URL, dan Project ID terlebih dahulu!");
            return;
        }

        try {
            // Test dengan config sementara
            const testConfig = {
                apiKey: apiKey,
                authDomain: document.getElementById('fbAuthDomain')?.value?.trim() || '',
                databaseURL: databaseURL,
                projectId: projectId,
                storageBucket: document.getElementById('fbStorageBucket')?.value?.trim() || '',
                appId: document.getElementById('fbAppId')?.value?.trim() || ''
            };

            // Inisialisasi Firebase sementara untuk test
            const testApp = firebase.initializeApp(testConfig, "testApp");
            const testDb = testApp.database();
            
            // Coba write ke path test
            await testDb.ref('.info/connected').once('value');
            
            // Berhasil
            firebase.app("testApp").delete();
            alert("✅ Koneksi Firebase BERHASIL!\\n\\nConfig valid dan bisa digunakan.");
        } catch (e) {
            alert("❌ Koneksi Firebase GAGAL!\\n\\nError: " + e.message + "\\n\\nPeriksa kembali API Key dan Database URL.");
        }
    },

    // 10. INIT — LOAD CONFIG SAAT APLIKASI START
    async init() {
        await this.loadConfig();
        this.updateUI();
        return this.hasConfig();
    }
};
