# Prompt: WitchRPG v2 (Crimson Sovereign: Hutan)

Tempel seluruh isi file ini sebagai pesan pertama ke agen koding yang bekerja di `C:\MyRepo\WitchRPG-v2`. Agen mengerjakan Fase 0 (previz di Blender), berhenti di gerbangnya, lalu menunggu pemilik menulis "lanjut".

---

## Peran dan cara kerja

Kamu engineer game sekaligus technical artist. Proyekmu WitchRPG v2: action-RPG third-person bergaya God of War di hutan terbuka, dengan sistem gameplay yang sama seperti WitchRPG v1 (sihir Chaos, pasukan bayangan Umbra, Ledger, level, stat, skill).

Kerjakan per fase. Sebuah fase selesai bila semua kriteria gerbangnya terpenuhi dan terbukti (tes lulus, angka diukur, gambar dilihat), bukan bila kodenya sudah ditulis.

**Sekarang kerjakan Fase 0 saja.** Setelah gerbang Fase 0 terpenuhi, tampilkan hasilnya ke pemilik lalu berhenti sampai pemilik menulis "lanjut".

Keputusan kecil kamu ambil sendiri dan catat di `DESIGN.md` dengan format tabel v1 (Bagian | Keputusan | Alasan). Tanya pemilik hanya untuk keputusan yang mahal diulang dan bisa dijawab dua arah.

## Konteks

**V1** ada di `C:\MyRepo\WitchRPG`. Folder itu hanya dibaca; jangan diubah. Isinya:

- First-person, Three.js 0.187 + Vite + TypeScript, tanpa framework UI, Vitest, Express 5 + mysql2. Semua angka tuning di `src/game/balance.ts`; rumus di `src/game/progression.ts` dikunci tes.
- Witch Ilyra: tangan kiri Chaos (merah `#ff2a3d`), tangan kanan Umbra (ungu `#8f55ff`). Makhluk musuh bermata dan beretakan amber `#ffa53d`. Tema gelap, font Sora, Figtree, Martian Mono, audio disintesis WebAudio.
- Chaos: Hex Bolt, Telekinesis Grip (sampai 500 kg), Chaos Burst (Lv 3), Hex Snare (Lv 5), Hex Barrier (Lv 7), Reality Warp (Lv 10), Crimson Overload dari meter Chaos penuh lalu Backlash.
- Umbra: Umbra Rite (Lv 2) pada tubuh musuh yang bersinar, satu lemparan peluang per tubuh: `clamp(B_rank + 0,02 × (Lv witch − Lv musuh) + 0,01 × UMB, 0,10, 0,90)` dengan B Prajurit 0,60, Ksatria 0,45, Jenderal 0,30, Marsekal 0,15. Lalu Tukar Tempat (Lv 4), Perintah Fokus (Lv 6), Kebangkitan Jenderal (Lv 8), Kebangkitan Marsekal (Lv 9). Ruang Bayangan tanpa batas slot, T memanggil dan mengembalikan seluruh pasukan, roda perintah Z, pasukan besar digambar sebagai InstancedMesh.
- Progresi: XP ke level berikutnya `80 × n^1,5` sampai Lv 9, lalu +50% per level; 3 poin stat dan 1 poin skill per level; stat HEX, SPR, VIT, AGI, UMB mulai dari 5; menu Ledger (Tab).
- Musuh: Husk, Rift Hound, Spitter, Warden, Rift Lord, Harrier, Bombard, elit dengan sifat (Berlapis, Gesit, Meledak, Penjaga), boss The Hollow Warden tiga fase (hantaman, lantai runtuh dan cangkang, kebal kecuali di dalam Reality Warp).
- Dunia terbuka 500 × 500 m dengan 23 kamp yang levelnya naik menurut jarak dari pusat, altar penyembuh, gerbang Rift Tier I sampai V.

Baca `CLAUDE.md`, `README.md`, `DESIGN.md`, `src/game/*.ts` dan `src/engine/umbra.ts` di v1 sebelum memutuskan apa pun. `DESIGN.md` v1 adalah contoh format keputusan yang diinginkan pemilik.

**V2** ada di `C:\MyRepo\WitchRPG-v2` (repo git sudah ada, belum ada kode). Folder `assets/` berisi referensi gambar makhluk dari pemilik. Itu gambar konsep 2D, bukan model 3D:

| File | Isi |
| --- | --- |
| `167518dd7ed83f5f910603744479.jpg` (`images (3).jpg` salinan kecilnya) | Dua belas makhluk: Pegasus, Unicorn, Harpy, Imp, Naga, Dragon, Phoenix, Griffin, Incubus dan Succubus, Hippogriff, Lilith, Samael |
| `images (1).jpg` | Hydra berkepala banyak di air |
| `images (2).jpg` | Cerberus tiga kepala, urat biru bercahaya |
| `images (4).jpg` | Kolase: pria berkepala elang, Pegasus, sirene, naga hitam |
| `images (5).jpg` | Chimera: singa, kambing bertanduk, ekor ular |
| `images (6).jpg` | Singa bersayap berekor ular dan kepala besar bertanduk domba |
| `images (7).jpg` | Lembar makhluk mitos dunia (sirene, valkyrie, kitsune, qilin, simurgh, dan lain-lain) |
| `z0jfasz4aizd1.jpeg` (`(1)` salinannya) | Monster mitologi Yunani: Centaur, Cerberus, Harpy, Griffin, Hydra, Minotaur, Medusa, Cyclops, Chimera, Atlas, Typhon, Pegasus |

### Keputusan pemilik (24 Nov 2026)

1. Sistem gameplay mengikuti v1: dua tangan sihir, Chaos, Umbra, Ledger, level, stat, skill, pasukan bayangan.
2. Rasa permainan mengikuti God of War: kamera third-person di balik bahu, satu kamera tanpa pemotongan, tempur berbobot, boss sebagai set-piece.
3. Dunia terbuka berupa hutan.
4. Makhluk dan musuh mengacu pada gambar di `assets/`.
5. Gambaran game dibuat dulu di Blender sebelum game dibuat.

### Keputusan awal penyusun prompt (boleh kamu ubah di Fase 0 bila previz menunjukkan hal lain, catat alasannya)

- Third-person, bukan first-person. Karena itu `hands.ts` dan `player.ts` v1 ditulis ulang.
- Tidak ada lompat bebas, melayang, atau terbang. Spasi menjadi dodge. Tepian rendah dilewati lewat vault dan climb kontekstual (F). Terbang bebas merusak rasa berbobot God of War.
- Pengganti Atreus adalah pasukan bayangan.
- Pengganti Spartan Rage adalah Crimson Overload.
- Senjata dekat: tongkat bersigil (bukan rantai, bukan kapak). Tongkat bisa dilempar dan dipanggil kembali.
- Boss pertama: Hydra di rawa. Boss akhir (di luar versi pertama): Typhon atau Samael.

## Aturan yang tidak boleh dilanggar

- Jangan mengubah apa pun di `C:\MyRepo\WitchRPG`. Salin kode dari sana, jangan tautkan.
- Pemilik yang menjalankan commit dan push. Jangan `git commit`, `git push`, atau mengubah remote.
- IP: God of War hanya referensi rasa. Jangan pakai nama, karakter, atau desain darinya (Kratos, Atreus, Leviathan, Blades of Chaos, Spartan Rage, ikon tombol, bentuk HUD). Sama untuk Marvel dan Solo Leveling. Nama makhluk mitologi Yunani (Hydra, Cerberus, Minotaur, dan seterusnya) boleh dipakai; desainnya harus buatanmu.
- Gambar di `assets/` hanya untuk anatomi dan siluet. Jangan di-trace, jangan dipakai sebagai tekstur, jangan masuk ke `dist/` atau `public/`.
- Jangan menampilkan isi `.env`. Server dan database baru dikerjakan di Fase 6; pakai database terpisah `witch_rpg_v2`, tes memakai `witch_rpg_v2_test`.
- Bahasa: UI dan dokumen berbahasa Indonesia; kode dan komentar berbahasa Inggris, seperti v1. Ikuti blok antislop di `CLAUDE.md` (salin blok itu apa adanya ke `CLAUDE.md` v2, lalu tambahkan catatan proyek v2 di bawahnya). Komentar kode hanya untuk hal yang tidak terbaca dari kodenya.
- Jangan menyatakan sesuatu berhasil tanpa bukti: jalankan `npm test`, `npm run build`, bot uji (`?debug`), screenshot, dan ukur waktu frame di GPU NVIDIA (Chrome di laptop ini bisa jatuh ke GPU Intel; v1 mencatat 39,6 ms vs 2,6 ms. Minta `powerPreference: 'high-performance'` dan cek GPU yang dipakai).
- Port v2: Vite dev 5297, preview 4297, API 8913. Tes: API 8914, Vite 5298.

## Fase 0: Previz di Blender

Tujuan: pemilik melihat gambaran game sebelum satu baris kode game ditulis, dan mengunci angka kamera, skala, palet, serta peran tiap makhluk.

**Alat.** Blender 5.1 terpasang di `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe`. Jalankan tanpa antarmuka: `blender.exe -b -P skrip.py`. Cek `bpy.app.version_string` dan daftar mesin render yang tersedia sebelum memilih mesin: nama EEVEE berubah antar versi, jadi jangan menulis nama mesin dari ingatan. Cadangan: Cycles 64 sampel dengan denoise. Bila ada server MCP Blender di sesimu, boleh dipakai. Semua scene dibangun oleh skrip Python di `previz/blender/` supaya bisa diulang; tidak ada langkah manual yang tidak tercatat.

**Gaya.** Stylized gelap dengan geometri sederhana, bukan fotorealistik. Hutan bersiluet kuat: pinus dan birch dengan variasi tinggi, kabut bervolume, berkas cahaya menembus tajuk. Ilyra: jubah gelap, tongkat bersigil, tangan kiri merah menyala, tangan kanan ungu menyala. Musuh: badan gelap dengan mata dan retakan amber. Setiap zona punya warna kabut sendiri (lihat tabel zona). Tidak perlu tekstur; pakai warna datar, vertex color, dan emisi.

**Keluaran** di `previz/`:

| File | Isi |
| --- | --- |
| `renders/01-hero-bahu.png` | Ilyra dari balik bahu kanan di tanah lapang hutan, sekawanan Imp di depannya. Ini acuan kamera game |
| `renders/02-lembah-hutan.png` | Pemandangan lebar yang memperlihatkan lima zona dengan warna kabutnya |
| `renders/03-barisan-makhluk.png` | Semua makhluk dalam skala nyata di samping Ilyra (1,7 m) dengan penggaris tinggi |
| `renders/04-tempur-minotaur.png` | Tengah pertarungan: ayunan tongkat, cincin amber peringatan serangan |
| `renders/05-boss-hydra.png` | Hydra muncul dari Danau Hitam saat senja |
| `renders/06-pasukan-bangkit.png` | Prajurit bayangan naik dari kolam ungu di hutan |
| `animatic.mp4` | 20 sampai 30 detik, 1280 × 720, 24 fps: terbang di atas lembah, turun ke bahu Ilyra, berjalan, lock-on, Hydra muncul |
| `papan-makhluk.png` | Per makhluk: thumbnail referensi di samping block-out 3D buatanmu, plus peran, rank Umbra Rite, dan zona |
| `witchrpg-v2-previz.blend` | File Blender hasil skrip |
| `PREVIZ.md` | Angka kamera final, skala tiap makhluk, anggaran poligon, palet per zona, dan apa yang kamu ubah dari prompt ini beserta alasannya |

**Block-out makhluk.** Bangun semua makhluk di tabel roster sebagai block-out 3D dari bentuk sederhana yang menangkap siluet dan skala dari referensi. Block-out yang bagus nanti dipakai sebagai dasar model akhir.

**Angka kamera awal** (finalkan lewat previz): jarak 3,4 m di belakang, offset bahu kanan 0,85 m, tinggi 1,65 m, FOV 68°. Mode bidik (RMB tahan): jarak 2,0 m, offset 0,65 m, FOV 54°. Kamera tidak pernah memotong adegan. Lock-on menjaga target di sepertiga kanan atas layar.

**Gerbang Fase 0:** semua keluaran di atas ada, kamu sudah melihat tiap gambar dan animatic (bukan hanya menghasilkannya), `PREVIZ.md` memuat angka kamera dan skala, dan pemilik sudah menerima ringkasan: apa yang dibuat, di mana, dan keputusan yang butuh jawaban pemilik. Lalu berhenti.

## Spesifikasi game (dipakai mulai Fase 1)

### Kontrol default (ubah bila previz menunjukkan masalah, catat di `DESIGN.md`)

Prinsip: tap = cepat, tahan = berat atau berkelanjutan. Tombol sihir v1 dipertahankan.

| Aksi | Input |
| --- | --- |
| Gerak, lari | WASD, Shift |
| Dodge (roll ke arah gerak) | Spasi |
| Tahan serangan, parry | Tahan C; tekan tepat saat serangan amber mengenai |
| Serang ringan, berat | Klik kiri (tap, tahan) |
| Mode bidik | Tahan klik kanan |
| Saat membidik: Hex Bolt, Telekinesis Grip | Klik kiri tap, klik kiri tahan (lepas untuk melempar) |
| Lempar dan panggil tongkat | H |
| Lock-on, ganti target | Klik tengah, gerak mouse |
| Chaos Burst, Hex Snare, Hex Barrier, Reality Warp | Q, E, X, V |
| Crimson Overload | G |
| Umbra Rite pada tubuh bersinar | Tahan R |
| Panggil atau kembalikan pasukan | T |
| Roda perintah bayangan | Tahan Z |
| Interaksi (altar, vault, climb, Eksekusi) | F |
| Ledger, jeda | Tab, Esc |

### Tempur (rasa God of War, nama dan visual sendiri)

- Kombo tongkat tiga pukulan ringan dan satu berat; dodge dengan i-frame singkat; tahan dan parry dengan jendela waktu yang diukur dan dikunci tes.
- Telegraf musuh dua jenis, keduanya amber (warna musuh v1): cincin berdenyut lambat berarti bisa ditahan atau di-parry; garis tebal berkedip cepat berarti harus dodge.
- Meter stun per musuh, diisi serangan berat, parry, Hex Bolt, dan lemparan tongkat. Saat penuh, musuh limbung dan F memulai Eksekusi (animasi singkat; kamera tetap satu kamera). Eksekusi menambah peluang Umbra Rite pada tubuh itu (usulan +0,15; tentukan dan kunci dengan tes).
- Lemparan tongkat: lurus ke titik bidik, menancap, dipanggil dengan H dan mengenai musuh di jalur kembalinya.
- Meter Chaos, Crimson Overload, dan Backlash dari v1 tetap; angka masuk `balance.ts`.
- Pasukan bayangan bertarung di sisi Ilyra; perintah, Tukar Tempat, dan Perintah Fokus dari v1 tetap.

### Zona hutan

Dunia sekitar 1.000 × 1.000 m, satu peta kontinu tanpa layar muat. Level musuh naik menurut zona (pita tiga level per tier, seperti v1), dan kamp elit ada di tepi zona.

| Zona | Tier | Level | Suasana dan kabut | Makhluk |
| --- | --- | --- | --- | --- |
| Hutan Pembuka | I | 1–3 | Pinus dan birch rapat, kabut pagi putih kebiruan | Imp, Hellhound |
| Tebing Berangin | II | 4–6 | Tebing batu, pinus jarang, kabut tipis hangat | Harpy, Centaur pemanah, Griffin liar |
| Rawa Berkabut | III | 7–9 | Rawa, akar tinggi, kabut hijau pucat | Naga rawa, Medusa, Chimera (mini-boss); Danau Hitam di ujungnya adalah sarang Hydra |
| Reruntuhan Kuil | IV | 10–12 | Kuil batu ditelan hutan, kabut abu | Minotaur, Cyclops, Succubus, Incubus, elit. Terbuka setelah Hydra kalah |
| Lembah Bara | V | 13–15 | Hutan terbakar, Rift robek di langit, kabut oranye | Phoenix, Dragon, Cerberus, Lilith. Terbuka setelah Hydra kalah |

Titik minat: altar (penyembuh, titik bangkit, perjalanan cepat antar altar yang sudah dibuka seperti altar v1), kamp makhluk, reruntuhan kecil, peti, jalan setapak. Tumbang berarti bangkit di altar terakhir, XP dan bayangan tetap, kamp yang sudah ditaklukkan tetap padam, seperti v1.

### Roster makhluk

| Makhluk | Peran (padanan v1) | Rank Rite | Catatan |
| --- | --- | --- | --- |
| Imp | Husk: kerumunan | Prajurit | Berkerumun, melompat dan mencakar, ancang-ancang 0,5 dtk |
| Hellhound (Cerberus kecil) | Rift Hound | Prajurit | Menerjang dari samping, kawanan 3 sampai 5 |
| Harpy | Harrier | Prajurit | Melayang, menjerit 0,7 dtk, menukik; jawab dengan Hex Bolt ke atas atau Telekinesis yang menarik turun |
| Centaur | Spitter | Prajurit | Memanah dari punggung bukit |
| Naga rawa | Spitter air | Prajurit | Menyembur dari air, menyelam saat ditembak |
| Minotaur | Warden | Ksatria | Kapak dan seruduk; menahan 85% damage dari depan, lemparan tongkat dan Telekinesis menembus |
| Cyclops | Bombard dan tank | Ksatria; elit Jenderal | Melempar batu berbusur dengan lingkaran amber; terlalu berat untuk diangkat |
| Medusa | Penyihir mini-boss | Jenderal | Tatapan membatu bila tidak ditahan; Hex Barrier atau lock-on menjaga jarak |
| Chimera | Rift Lord | Jenderal | Tiga kepala: singa api, kambing menyeruduk, ular beracun di ekor |
| Succubus, Incubus | Elit penyumon | Ksatria elit | Memanggil Imp, berpindah posisi |
| Griffin, Hippogriff | Penukik elit udara | Ksatria | Bisa tidak bermusuhan; kandidat tunggangan bayangan |
| Phoenix | Elit "Meledak" | Jenderal | Bangkit sekali dari abu lalu meledak |
| Dragon | Set-piece Tier V | Marsekal | Pertarungan besar, di luar versi pertama bila terlalu mahal |
| Hydra | **Boss 1** | Marsekal | Tiga fase, lihat di bawah |
| Cerberus besar, Lilith | Boss atau mini-boss Tier V | Marsekal | Setelah Hydra |
| Typhon, Samael, Atlas | Boss akhir atau cadangan | Marsekal | Di luar versi pertama |
| Pegasus, Unicorn | Bukan musuh | n/a | Satwa hutan; Unicorn penjaga altar. Pegasus bayangan sebagai tunggangan adalah tugas opsional |

Sifat elit v1 (Berlapis, Gesit, Meledak, Penjaga) tetap, dengan tulisan sifat di atas bar HP.

### Boss 1: Hydra (pakai struktur tiga fase The Hollow Warden)

1. Kepala menghantam tanah (cincin amber, ancang-ancang 1,3 dtk) dan menyemburkan gelombang Imp. Kepala yang terkena kombo berat limbung dan bisa di-Eksekusi.
2. Air naik, daratan pecah menjadi pulau-pulau. Kulit berlendir: Hex Bolt hanya 10%, benda yang dilempar 150%. Batu selalu tersedia di pulau terdekat.
3. Hydra menelan sisa kepalanya dan kebal kecuali di dalam Reality Warp; di dalam medan jantungnya terbuka dan menerima +50% damage. Karena Reality Warp terbuka di Lv 10, gerbang sarang Hydra hanya terbuka untuk witch Lv 10, seperti Jantung Rift v1.

Tiap fase baru memulihkan 25% HP dan 30 mana. Hadiah: XP besar dan peluang dasar 15% membangkitkan Hydra sebagai Marsekal, satu kali.

### Anggaran teknis

- Medan: terrain per chunk dengan LOD. Pohon, semak, batu, dan rumput sebagai InstancedMesh dengan culling per chunk. Kabut per zona. Sasaran: median ≤ 16,7 ms per frame di 1920 × 1080 pada GPU NVIDIA laptop pemilik, dengan hutan penuh, 20 musuh, dan 200 bayangan. Catat angka terukur di `DESIGN.md`.
- Model: ekspor GLB dari Blender lewat skrip. Mob ≤ 8.000 segitiga, boss ≤ 30.000, Ilyra ≤ 20.000. Satu sampai tiga material datar atau vertex color; tanpa tekstur besar. Rig ≤ 40 tulang. Animasi bernama: `idle`, `walk`, `run`, `attack1`, `attack2`, `telegraph`, `hit`, `die`; Ilyra tambah `dodge`, `block`, `parry`, `cast_l`, `cast_r`, `throw`, `recall`, `raise`, `execute`. Bila animasi per tulang di Blender terlalu mahal, buat model dari bagian bernama dan animasikan prosedural di Three.js seperti `models.ts` v1. Total unduhan aset di bawah 40 MB.
- Pasukan: pakai ulang kerumunan InstancedMesh v1 (`umbra.ts`, `crowd.ts`) dan indeks tabrakan (`collide.ts`). Bayangan tiap makhluk memakai model makhluk itu dengan material ungu.
- Struktur kode: sama seperti v1 (`src/game`, `src/engine`, `src/ui`, `src/data`, `server`, `tests`). **Salin dan sesuaikan**: `game/*`, `engine/{umbra,crowd,collide,fx,audio,projectiles,spells,units,boss,input,palette}`, `ui/{hud,ledger,account}`, `server/`, `tests/`. **Tulis ulang**: kontrol dan kamera pemain (third-person), tangan first-person dihapus, dunia hutan (menggantikan `world`, `openworld`, `worldmode`, `lair`, `rift`, `props`), model (menggantikan `models.ts` prosedural). Pasukan tidak boleh lebih lambat dari v1.
- Pengujian: pertahankan tes progresi dan rumus v1 dan tambahkan tes untuk jendela parry, meter stun, tabrakan kamera, pita level zona, dan peluang Rite dengan bonus Eksekusi. `?debug` membuka `window.__game` dan `__game.debugSpeed` untuk bot uji.

## Fase berikutnya (jangan dikerjakan sebelum pemilik menulis "lanjut")

| Fase | Isi | Gerbang |
| --- | --- | --- |
| 1. Fondasi | Scaffold proyek (salin konfigurasi v1, nama paket `witch-rpg-v2`), terrain dan hutan dengan instancing, kamera bahu dan mode bidik, kontrol karakter dengan kapsul, dodge, lock-on, kabut, `CLAUDE.md`, `README.md`, `DESIGN.md` | Sepuluh menit berjalan, dodge, dan lock-on di hutan; kamera tidak menembus pohon atau batu; median ≤ 16,7 ms; tes kamera lulus |
| 2. Tempur | Kombo tongkat, block dan parry, meter stun, Eksekusi, Hex Bolt, lempar tongkat, Telekinesis, Burst, Snare, Barrier, Warp, meter Chaos dan Overload; model Ilyra; Imp, Hellhound, Harpy dengan telegraf | Bot menaklukkan satu kamp Tier I tanpa terkena serangan yang bisa ditahan; jendela parry terukur dan dikunci tes |
| 3. Umbra | Umbra Rite, Ruang Bayangan, T, roda Z, Tukar Tempat, Perintah Fokus, kerumunan pasukan | Pola ukur v1: 200 dan 500 bayangan dalam anggaran frame; peluang Rite sama dengan rumus v1 plus bonus Eksekusi |
| 4. Dunia dan progresi | Zona I sampai III, kamp, altar, Ledger, XP, stat, skill tree, Centaur, Naga rawa, Minotaur, Medusa, Chimera | Bot memainkan Lv 1 sampai 10 melewati tiga zona; level, simpanan, dan Ledger bekerja |
| 5. Boss dan akhir | Hydra tiga fase, Kebangkitan Marsekal, zona IV dan V, Cyclops, Succubus, Incubus, Phoenix, elit | Bot mengalahkan Hydra; hanya witch Lv 10 yang bisa masuk sarang; zona IV dan V bisa dimainkan |
| 6. Poles | Model dan animasi GLB final, audio, VFX, akun dan simpanan server (database `witch_rpg_v2`), performa | Build bersih, semua tes lulus, laporan akhir |

## Format laporan di akhir tiap fase

1. Hasil dalam dua sampai tiga kalimat dan di mana file-nya.
2. Angka yang kamu ukur (frame time, hasil bot, tes lulus berapa dari berapa).
3. Keputusan yang kamu ambil sendiri (juga masuk ke `DESIGN.md`).
4. Hal yang butuh keputusan pemilik, paling banyak tiga.
