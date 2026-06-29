// db.js — Database Lokal IndexedDB v2.0 (Tambah: Store app_config untuk Firebase)
const DB = {
    instance: null,
    DB_NAME: "KasirProDB_v2",
    DB_VERSION: 16, // Naik versi: tambah store app_config

    async init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            req.onerror = () => reject(req.error);
            req.onsuccess = () => { this.instance = req.result; resolve(this.instance); };

            req.onupgradeneeded = (e) => {
                const db = e.target.result;

                // Store yang sudah ada
                if (!db.objectStoreNames.contains("produk")) db.createObjectStore("produk", { keyPath: "barcode" });
                if (!db.objectStoreNames.contains("transaksi")) db.createObjectStore("transaksi", { keyPath: "id", autoIncrement: true });
                if (!db.objectStoreNames.contains("karyawan")) db.createObjectStore("karyawan", { keyPath: "username" });
                if (!db.objectStoreNames.contains("draft_laci")) db.createObjectStore("draft_laci", { keyPath: "id", autoIncrement: true });
                if (!db.objectStoreNames.contains("request_stok")) db.createObjectStore("request_stok", { keyPath: "id", autoIncrement: true });
                if (!db.objectStoreNames.contains("setting_toko")) db.createObjectStore("setting_toko", { keyPath: "kunci" });
                if (!db.objectStoreNames.contains("log_aktivitas")) db.createObjectStore("log_aktivitas", { keyPath: "id", autoIncrement: true });

                // TAMBAH: Store config aplikasi (Firebase, dll)
                if (!db.objectStoreNames.contains("app_config")) {
                    db.createObjectStore("app_config", { keyPath: "kunci" });
                    console.log("✅ Store app_config dibuat");
                }
            };
        });
    },

    async get(storeName, key) {
        if (!this.instance) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.instance.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async getAll(storeName) {
        if (!this.instance) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.instance.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    },

    async put(storeName, data) {
        if (!this.instance) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.instance.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            const req = store.put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async delete(storeName, key) {
        if (!this.instance) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.instance.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    // TAMBAH: Helper untuk config aplikasi
    async getConfig(kunci) {
        return await this.get("app_config", kunci);
    },

    async saveConfig(kunci, nilai) {
        return await this.put("app_config", { kunci: kunci, nilai: nilai, updatedAt: Date.now() });
    },

    async deleteConfig(kunci) {
        return await this.delete("app_config", kunci);
    },

    async getAllConfig() {
        return await this.getAll("app_config");
    }
};
