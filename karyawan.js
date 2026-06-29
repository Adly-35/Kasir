// karyawan.js — Modul Manajemen Karyawan & Akun Staf (FIXED: Remove ?., add null checks)
const Karyawan = {
    AVATAR_DEFAULT: "https://ui-avatars.com/api/?name=User&background=2196F3&color=fff&size=128",

    tampilkanForm() {
        const panel = document.getElementById('panelFormKaryawan');
        const btn = document.getElementById('btnTambahKaryawan');
        if (panel) panel.classList.remove('hidden');
        if (btn) btn.classList.add('hidden');
    },

    sembunyikanForm() {
        const panel = document.getElementById('panelFormKaryawan');
        const btn = document.getElementById('btnTambahKaryawan');
        if (panel) panel.classList.add('hidden');
        if (btn) btn.classList.remove('hidden');
        this.resetForm();
    },

    bukaFormTambah() {
        if (typeof Auth !== 'undefined' && !Auth.isOwner()) {
            alert("⛔ Akses ditolak! Hanya Owner utama yang dapat mendaftarkan akun baru.");
            return;
        }
        this.resetForm();
        this.tampilkanForm();
        const kUsername = document.getElementById('kUsername');
        if (kUsername) {
            kUsername.disabled = false;
            kUsername.focus();
        }
    },

    resetForm() {
        const fields = ['kUsername', 'kNama', 'kPassword', 'kFoto'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const judul = document.getElementById('judulFormKaryawan');
        if (judul) judul.textContent = 'Tambah Akun Baru';
        const previewBox = document.getElementById('previewFotoForm');
        if (previewBox) previewBox.style.display = 'none';
    },

    async persiapanEdit(username) {
        if (typeof Auth !== 'undefined' && !Auth.isOwner()) {
            alert("⛔ Akses ditolak! Hanya Owner utama yang dapat memodifikasi akun.");
            return;
        }

        const k = await DB.get("karyawan", username);
        if (!k) return;

        this.tampilkanForm();

        const judul = document.getElementById('judulFormKaryawan');
        if (judul) judul.textContent = '📝 Edit Akun @' + username;

        const kUsername = document.getElementById('kUsername');
        if (kUsername) {
            kUsername.value = k.username;
            kUsername.disabled = true;
        }

        const kNama = document.getElementById('kNama');
        if (kNama) kNama.value = k.nama;

        const kLevel = document.getElementById('kLevel');
        if (kLevel) kLevel.value = k.role || k.level || 'Kasir';

        const kPassword = document.getElementById('kPassword');
        if (kPassword) {
            kPassword.value = '';
            kPassword.placeholder = "(Kosongkan jika sandi tidak diubah)";
        }

        const previewBox = document.getElementById('previewFotoForm');
        const previewImg = document.getElementById('imgPreviewForm');
        if (k.foto && previewBox && previewImg) {
            previewImg.src = k.foto;
            previewBox.style.display = 'block';
        } else if (previewBox) {
            previewBox.style.display = 'none';
        }
    },

    async simpanKaryawan() {
        const usernameEl = document.getElementById('kUsername');
        const namaEl = document.getElementById('kNama');
        const passwordEl = document.getElementById('kPassword');
        const levelEl = document.getElementById('kLevel');
        const fileEl = document.getElementById('kFoto');

        const username = usernameEl ? usernameEl.value.trim().toLowerCase() : '';
        const nama = namaEl ? namaEl.value.trim() : '';
        const password = passwordEl ? passwordEl.value : '';
        const level = levelEl ? levelEl.value : 'kasir';

        if (!username || !nama) {
            alert("❌ Username dan Nama Lengkap wajib diisi!");
            return;
        }

        const akunLama = await DB.get("karyawan", username);
        let passwordFinal = "";

        if (akunLama) {
            passwordFinal = !password ? akunLama.pass : btoa(password);
        } else {
            if (!password) {
                alert("❌ Untuk pembuatan akun baru, Password wajib diisi!");
                return;
            }
            passwordFinal = btoa(password);
        }

        let role = 'Kasir';
        if (level === 'admin' || level === 'Owner') role = 'Owner';
        else if (level === 'supervisor' || level === 'Supervisor') role = 'Supervisor';
        else if (level === 'kasir' || level === 'Kasir') role = 'Kasir';

        const prosesSimpan = async (fotoBase64) => {
            const dataKaryawan = {
                username: username,
                nama: nama,
                level: level,
                role: role,
                pass: passwordFinal,
                foto: fotoBase64 || (akunLama ? akunLama.foto : null),
                updatedAt: Date.now()
            };

            try {
                await DB.put("karyawan", dataKaryawan);

                if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
                    await firebase.database().ref('karyawan/' + username).set(dataKaryawan);
                    console.log("☁️ Karyawan synced to Firebase");
                }

                if (typeof Beep !== 'undefined' && Beep.ok) Beep.ok();
                this.sembunyikanForm();
                alert('✅ Akun @' + username + ' berhasil disimpan & disinkron ke cloud!');
                this.loadList();
            } catch (err) {
                alert("❌ Gagal menyimpan: " + err);
                console.error(err);
            }
        };

        if (fileEl && fileEl.files && fileEl.files[0]) {
            this.kompresFoto(fileEl.files[0], 200, 200, 0.6, (fotoBase64) => {
                prosesSimpan(fotoBase64);
            });
        } else {
            prosesSimpan(null);
        }
    },

    async hapusAkun(username) {
        if (typeof Auth !== 'undefined' && !Auth.isOwner()) {
            alert("⛔ Akses ditolak!"); return;
        }
        if (!confirm('⚠️ Yakin ingin menghapus akun @' + username + '? Tindakan ini tidak bisa dibatalkan!')) return;

        try {
            await DB.delete("karyawan", username);
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
                await firebase.database().ref('karyawan/' + username).remove();
            }
            alert('🗑️ Akun @' + username + ' berhasil dihapus.');
            this.loadList();
        } catch (e) {
            alert("❌ Gagal menghapus: " + e.message);
        }
    },

    kompresFoto(file, maxW, maxH, quality, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > h) { if (w > maxW) { h *= maxW / w; w = maxW; } }
                else { if (h > maxH) { w *= maxH / h; h = maxH; } }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                callback(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    async loadList() {
        const tbody = document.getElementById('tabelKaryawanBodi');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (typeof Auth !== 'undefined' && !Auth.isOwner() && !Auth.isSupervisor()) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">⛔ Akses ditolak. Hanya Owner/Supervisor yang dapat melihat daftar karyawan.</td></tr>';
            return;
        }

        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
            try {
                const snapshot = await firebase.database().ref('karyawan').once('value');
                const fbData = snapshot.val();
                if (fbData) {
                    for (const [key, val] of Object.entries(fbData)) {
                        const local = await DB.get("karyawan", key);
                        if (!local || (val.updatedAt && local.updatedAt && val.updatedAt > local.updatedAt)) {
                            await DB.put("karyawan", val);
                        }
                    }
                }
            } catch (e) {
                console.log("Sync karyawan from Firebase failed (offline?):", e);
            }
        }

        const list = await DB.getAll("karyawan");

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">Belum ada akun karyawan terdaftar.</td></tr>';
            return;
        }

        list.forEach(k => {
            const roleDisplay = k.role || k.level || 'Kasir';

            let badgeRole = '<span class="badge-info bg-success" style="padding:2px 6px; font-size:11px; border-radius:4px; color:#fff;">👤 Kasir</span>';
            if (roleDisplay === 'Owner' || k.level === 'admin' || k.level === 'owner') {
                badgeRole = '<span class="badge-info bg-danger" style="padding:2px 6px; font-size:11px; border-radius:4px; color:#fff;">👑 Owner</span>';
            } else if (roleDisplay === 'Supervisor' || k.level === 'supervisor') {
                badgeRole = '<span class="badge-info bg-warning" style="padding:2px 6px; font-size:11px; border-radius:4px; color:#333;">⚡ Ka. Toko</span>';
            }

            const fotoSrc = k.foto || this.AVATAR_DEFAULT;
            const isSelf = Auth.currentUser && Auth.currentUser.username === k.username;

            let hapusBtn = '-';
            if (Auth.isOwner()) {
                hapusBtn = isSelf 
                    ? '<span style="color:#999; font-size:11px;">🚫 Sesi Aktif</span>'
                    : '<button class="btn btn-sm" style="background:#d9534f; color:white; padding:2px 6px; font-size:11px;" onclick="Karyawan.hapusAkun(\'' + k.username + '\')">✕ Hapus</button>';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = '
                <td><code>' + k.username + '</code></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="' + fotoSrc + '" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #ccc;" onerror="this.src=\'' + this.AVATAR_DEFAULT + '\'">
                        <a href="javascript:void(0)" onclick="Karyawan.bukaDetailProfil(\'' + k.username + '\')" style="font-weight: bold; color: #2196F3; text-decoration: none;">' + k.nama + '</a>
                    </div>
                </td>
                <td>' + badgeRole + '</td>
                <td style="text-align:center;">
                    <button class="btn btn-sm" style="background:#2196F3; color:white; padding:2px 6px; font-size:11px; margin-right:4px;" onclick="Karyawan.persiapanEdit(\'' + k.username + '\')">📝 Edit</button>
                    ' + hapusBtn + '
                </td>
            ';
            tbody.appendChild(tr);
        });
    },

    async bukaDetailProfil(username) {
        const k = await DB.get("karyawan", username);
        if (!k) return;

        const semuaTransaksi = await DB.getAll("transaksi");
        const semuaRequest = await DB.getAll("request_stok");

        const transaksiSaya = semuaTransaksi.filter(t => t.kasir === k.username);
        const requestSaya = semuaRequest.filter(r => r.kasir === k.username);

        const detFoto = document.getElementById('detFoto');
        if (detFoto) detFoto.src = k.foto || this.AVATAR_DEFAULT;

        const detNama = document.getElementById('detNama');
        if (detNama) detNama.textContent = k.nama;

        const detUsername = document.getElementById('detUsername');
        if (detUsername) detUsername.textContent = '@' + k.username;

        const roleDisplay = k.role || k.level || 'Kasir';
        let badgeHtml = '<span class="badge-info bg-success" style="padding:3px 8px; border-radius:4px; color:#fff; font-size:12px;">👤 Kasir Toko</span>';
        if (roleDisplay === 'Owner' || k.level === 'admin' || k.level === 'owner') {
            badgeHtml = '<span class="badge-info bg-danger" style="padding:3px 8px; border-radius:4px; color:#fff; font-size:12px;">👑 Owner Toko</span>';
        } else if (roleDisplay === 'Supervisor' || k.level === 'supervisor') {
            badgeHtml = '<span class="badge-info bg-warning" style="padding:3px 8px; border-radius:4px; color:#333; font-size:12px;">⚡ Kepala Toko</span>';
        }
        const detBadge = document.getElementById('detBadge');
        if (detBadge) detBadge.innerHTML = badgeHtml;

        const detStatTrans = document.getElementById('detStatTrans');
        if (detStatTrans) detStatTrans.textContent = transaksiSaya.length;

        const detStatReq = document.getElementById('detStatReq');
        if (detStatReq) detStatReq.textContent = requestSaya.length;

        const panelLog = document.getElementById('detRiwayatKerja');
        if (panelLog) {
            let logHtml = "";
            if (transaksiSaya.length === 0 && requestSaya.length === 0) {
                logHtml = '<div style="color:#999; text-align:center; padding:10px;">Belum ada jejak riwayat aktivitas.</div>';
            } else {
                transaksiSaya.slice(0, 3).forEach(t => {
                    logHtml += '<div style="border-bottom:1px dashed #eee; padding:6px 0;">🛒 <small style="color:#888;">' + new Date(t.tanggal).toLocaleDateString('id-ID') + '</small><br>Melayani <strong>' + t.noStruk + '</strong> — <strong>Rp ' + t.total.toLocaleString('id-ID') + '</strong></div>';
                });
                requestSaya.slice(0, 3).forEach(r => {
                    logHtml += '<div style="border-bottom:1px dashed #eee; padding:6px 0; background:#fffde7;">📤 <small style="color:#888;">' + new Date(r.tgl_request).toLocaleDateString('id-ID') + '</small><br>Request Stok <strong>' + r.nama_barang + '</strong> (' + r.jumlah + ' pcs) - <span style="color:#2196F3; font-weight:bold;">' + r.status.toUpperCase() + '</span></div>';
                });
            }
            panelLog.innerHTML = logHtml;
        }

        const areaUtama = document.getElementById('areaKaryawanUtama');
        const areaDetail = document.getElementById('areaKaryawanDetail');
        if (areaUtama) areaUtama.classList.add('hidden');
        if (areaDetail) areaDetail.classList.remove('hidden');
    },

    kembaliKeDaftar() {
        const detail = document.getElementById('areaKaryawanDetail');
        const utama = document.getElementById('areaKaryawanUtama');
        if (detail) detail.classList.add('hidden');
        if (utama) utama.classList.remove('hidden');
        this.loadList();
    }
};
