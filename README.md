# Crimson Sovereign: Hutan, versi Easy (WitchRPG v2 Easy)

Salinan [WitchRPG v2](../WitchRPG-v2) dengan satu perbedaan: **setiap Umbra Rite berhasil (100%)**, jadi semua tubuh yang bersinar bangkit menjadi bayangan, dari Imp sampai boss Marsekal. Syarat rank tetap: Jenderal butuh Kebangkitan Jenderal, Marsekal butuh Kebangkitan Marsekal. Versi Easy punya port, database (`witch_rpg_v2_easy`), cookie akun, dan simpanan browser sendiri, jadi bisa dijalankan berdampingan dengan versi biasa. Saat dibuat (26 Nov 2026), akun dan isi `witch_rpg_v2` disalin ke sini: akun `vmk` dengan witch Lv 15, 125 bayangan, 7 altar menyala, dan 5 boss tumbang. Setelah itu keduanya berjalan sendiri-sendiri.

Action-RPG third-person di hutan terbuka. Kamu bermain sebagai Ilyra dari balik bahu kanannya: tangan kirinya membengkokkan realitas dengan sihir Chaos, tangan kanannya membangkitkan musuh yang kalah menjadi pasukan bayangan. Sistem gameplay mengikuti [WitchRPG v1](../WitchRPG); rasa kamera dan tempurnya mengacu pada game aksi third-person berbobot.

Game ini dibangun per fase menurut [PROMPT.md](./PROMPT.md). Keputusan desain ada di [DESIGN.md](./DESIGN.md), gambaran awal di Blender (render, animatic, papan makhluk) di [previz/](./previz/PREVIZ.md).

| Fase | Isi | Status |
| --- | --- | --- |
| 0. Previz | Gambaran game di Blender: kamera, skala, palet, block-out semua makhluk | Selesai |
| 1. Fondasi | Lembah hutan 1 km dengan lima zona (di Easy kini 5 km, enam zona), kamera bahu, gerak, dodge, mode bidik, lock-on | Selesai |
| 2. Tempur | Kombo tongkat, parry, Eksekusi, sihir Chaos, Imp, Hellhound, Harpy | Selesai |
| 3. Umbra | Umbra Rite, pasukan bayangan | Selesai |
| 4. Dunia dan progresi | Zona I sampai III, altar, Ledger, Centaur, Naga rawa, Minotaur, Medusa, Chimera | Selesai |
| 5. Boss | Hydra tiga fase, zona IV dan V, Cyclops, Succubus, Incubus, Phoenix, makhluk elit | Selesai |
| 6. Poles | Model dengan warna dua nada, suara dan suasana per zona, partikel dan Rift di langit, akun dan simpanan server, ukuran performa | Selesai |

Setelah fase 6, atas permintaan pemilik: terbang, pandangan orang pertama, peta, seluruh roster makhluk (enam boss dunia, Griffin, Hippogriff, dan satwa), kamp dan kawanan yang lebih banyak, dan boss yang bangkit lagi setiap 45 detik.

Khusus versi Easy (28 Nov 2026): peta 5.000 x 5.000 m, zona keenam Tanah Ganjil dengan makhluk dari ukiran bestiari kuno (`assets/Monster pt2`), tujuh makhluk baru dari prompt pemilik, setiap jenis monster di daerahnya sendiri yang tersebar acak, varian warna untuk elite, dan jalur impor model GLB dari tool image-to-3D milik pemilik.

## Menjalankan

Butuh Node 22 atau lebih baru dan browser dengan WebGL 2.

```bash
npm install
npm run dev      # http://localhost:5301
npm run server   # server akun dan simpanan, port 8915 (butuh MySQL dan .env)
npm test         # tes progresi v1, kamera, gerak, peta dan daerah, hutan per petak, tempur, AI makhluk, simpanan, Hydra, dan impor model
npm run build    # hasil di dist/
npm start        # setelah build: server sekaligus melayani dist/ di http://localhost:8915
npm run users    # daftar akun
npm run set-user -- <username> <kata sandi>   # buat akun atau ganti kata sandinya
npm run models   # buat ulang model GLB dari block-out Blender (butuh Blender 5.1)
npm run models -- imp hellhound harpy --lod 0.22   # versi sederhana untuk kerumunan bayangan
npm run models:ai   # impor model GLB dari tool AI di assets/ (juga otomatis sebelum dev dan build)
```

Kalau game terasa berat di laptop dengan dua GPU, atur Chrome ke "High performance" di Windows: Settings, System, Display, Graphics.

## Akun dan simpanan

Salin `.env.example` menjadi `.env` dan isi akun MySQL. Server membuat database `witch_rpg_v2_easy` beserta tabelnya saat pertama jalan. Selama server jalan, layar mulai meminta masuk dengan username dan kata sandi; level, stat, skill, Ruang Bayangan, dan altar yang sudah menyala tersimpan di akun, jadi bisa dilanjutkan dari browser lain. Kalau server mati, pilih "Main tanpa akun": witch tersimpan di browser itu, dan ikut ke akun saat kamu masuk nanti.

## Kontrol

| Gerak dan kamera | |
| --- | --- |
| WASD, Shift | Jalan ke arah kamera, lari |
| Spasi | Dodge ke arah gerak; tanpa arah, mundur. Satu-satunya jawaban untuk garis amber yang berkedip |
| Mouse | Putar kamera |
| Klik tengah | Lock-on ke makhluk terdekat di depan; klik lagi untuk lepas |
| Sentak mouse ke samping | Pindah lock-on ke makhluk di sisi itu |
| B | Terbang atau mendarat. Di udara Spasi naik, C turun, Shift lebih cepat. Ilyra tidak bisa mendarat di air dalam |
| P | Pandangan orang pertama atau dari belakang bahu; pilihan ini ikut tersimpan |
| M | Peta: semua boss dan statusnya, altar, daerah tiap monster, dan kamp monster yang dicentang. Gulir atau + dan − untuk memperbesar, seret untuk menggeser. Game menunggu selama peta terbuka |
| Tab | Ledger: bagi poin stat dan skill, lihat dan lepas bayangan. Game menunggu selama Ledger terbuka |
| F di altar | Perjalanan cepat ke altar lain yang sudah menyala, atau buka Ledger |
| Esc | Jeda: sensitivitas, volume, bayangan detail penuh, guncangan kamera |

| Tempur | |
| --- | --- |
| Klik kiri | Tiga pukulan tongkat berantai; tahan untuk pukulan berat |
| Tahan C | Tahan serangan dari depan. Tekan tepat saat cincin amber penuh untuk parry: makhluk limbung |
| F | Eksekusi makhluk yang limbung; tubuhnya lebih mudah dibangkitkan (+15%) |
| H | Lempar tongkat ke titik bidik atau target lock-on; tekan lagi untuk memanggilnya, mengenai makhluk di jalur pulang |

| Sihir Chaos (tangan kiri) | |
| --- | --- |
| Tahan klik kanan | Bidik |
| Saat membidik: klik kiri | Hex Bolt; menjatuhkan Harpy dari udara |
| Saat membidik: tahan klik kiri | Telekinesis pada makhluk, atau pada batu di pulau sarang Hydra; lepas untuk melempar ke titik bidik |
| Q, E, X, V | Chaos Burst (Lv 3), Hex Snare (Lv 5), Hex Barrier (Lv 7), Reality Warp (Lv 10). Tanpa membidik, mengenai target lock-on atau titik di depan Ilyra |
| G | Crimson Overload saat meter Chaos penuh |

| Umbra (tangan kanan) | |
| --- | --- |
| Tahan R | Umbra Rite pada tubuh yang bersinar ungu (Lv 2); dua tubuh atau lebih dalam 12 m dibangkitkan sekaligus |
| T | Panggil atau kembalikan seluruh pasukan |
| Tahan Z | Roda perintah: gerakkan mouse ke Ikuti, Serang, Tahan, atau Tukar Tempat (Lv 4), lalu lepas Z. Perintah Fokus (Lv 6) membuat semua bayangan menyerang satu target |

## Dunia

Peta 5.000 x 5.000 m dengan enam zona; hutan dan medan dimuat bertahap di sekitar Ilyra. Setiap jenis monster punya daerahnya sendiri (45 daerah, garis berlekuk, letaknya tersebar acak tapi selalu sama), dan kampnya hanya berisi jenis itu.

| Zona | Level | Makhluk |
| --- | --- | --- |
| I Hutan Pembuka (selatan) | 1 sampai 3 | Imp, Hellhound, dan di selatan jauh Aziza, Kitsune, Sylph, Banshee |
| II Tebing Berangin (dataran tinggi timur, dua sayap) | 4 sampai 6 | Harpy, Centaur, Griffin, Hippogriff, Aquilon |
| III Rawa Berkabut (barat) | 7 sampai 9 | Naga rawa, Minotaur, Duyung di telaganya, mini-boss Medusa dan Chimera; Hydra di Danau Hitam |

### Boss dunia

Di balik segel, setiap boss menunggu sendirian di kampnya, dengan bar boss dan serangannya sendiri. Semuanya bisa dibangkitkan sebagai Marsekal, dan bangkit lagi 45 detik setelah tumbang (begitu juga Hydra).

| Boss | Level | Tempat | Serangan |
| --- | --- | --- | --- |
| Cerberus | 15 | Lembah Bara | Gigitan tiga kepala, napas api, terjangan; memanggil Hellhound |
| Lilith | 16 | Lembah Bara | Lilitan ular, tombak gelap, kutukan beracun; menghilang dan memanggil Succubus |
| Dragon | 17 | Lembah Bara | Ekor, napas api, bola api, terkaman |
| Atlas | 17 | Reruntuhan Kuil, di kuil | Hentakan, bola dunia, lempar batu |
| Typhon | 18 | Reruntuhan Kuil, tepi utara | Hantaman badai, lecutan ular, petir; memanggil Harpy |
| Samael | 19 | Lembah Bara, di bawah Rift | Pedang, tebasan maut, penghakiman; menghilang |

### Hydra

Sarangnya di tepi Danau Hitam, dan hanya terbuka bagi witch Lv 10: fase terakhirnya hanya bisa dimenangkan dengan Reality Warp. Begitu pertarungan mulai, sarang tertutup sampai salah satu tumbang.

1. Kepala menghantam tanah di bawah cincin amber (1,3 dtk) dan memuntahkan Imp. Kepala yang tergeletak setelah menghantam bisa dipukul; yang limbung (parry atau kombo berat) bisa dieksekusi dengan F, dan setiap kepala yang terpenggal memotong 8% HP tubuhnya. Terlalu jauh dari tubuh, kepala menyembur dari jauh.
2. Air naik dan pulau batu muncul. Kulitnya berlendir: Hex Bolt hanya 10%, benda yang dilempar 150%. Batu selalu ada di pulau: bidik, tahan klik kiri, lalu lepas ke arah Hydra.
3. Hydra menelan kepalanya, merayap ke tepi, dan kebal kecuali di dalam Reality Warp (V): di sana jantungnya terbuka dan menerima 150%. Semburannya jatuh di lingkaran amber yang terisi; keluar sebelum penuh.

Setiap fase baru memulihkan 25% HP dan 30 mana. Kemenangan memberi XP besar, membuka segel, dan sekali saja tubuhnya bisa dibangkitkan sebagai Marsekal dengan Kebangkitan Marsekal (di versi Easy selalu berhasil).

## Struktur

```
src/game/     logika murni: angka tuning (balance.ts), progresi, skill, simpanan (dari v1)
src/engine/   kamera (camera.ts), gerak (player.ts), rintangan (obstacles.ts), lock-on, input, game loop (game.ts)
              tempur: aturan parry dan stun (combat.ts), Ilyra (fight.ts), sihir (spells.ts), makhluk dan bayangan (units.ts)
              Umbra (umbra.ts), gambar makhluk per bagian dan kerumunan (rigs.ts), telegraf amber (telegraph.ts)
              model Ilyra dan animasinya (models.ts), efek dan suara dari v1 (fx.ts, audio.ts)
              proyektil makhluk: panah dan semburan (projectiles.ts), batu yang bisa dilempar (props.ts)
src/world/    peta, zona, dan altar (map.ts, altars.ts), medan per chunk, hutan, kabut dan langit, kamp makhluk (camps.ts), satwa (fauna.ts)
              segel zona IV dan V (seal.ts), sarang dan pertarungan Hydra (lair.ts), partikel dan Rift di langit (ambient.ts)
src/data/     panggilan ke server akun (api.ts)
src/ui/       HUD, Ledger dan panel altar (ledger.ts), gerbang masuk dan baris akun (account.ts), peta (worldmap.ts)
server/       Express + MySQL: akun (auth.js dari v1), simpanan witch (app.js), tabel (db.js), npm run users dan set-user
tests/        Vitest: progresi v1, kamera, gerak, peta, tempur, AI makhluk, simpanan, Hydra dan makhluk fase 5, validasi server
previz/       skrip Blender, render, animatic, papan makhluk, PREVIZ.md
public/models model GLB hasil ekspor dari previz
```
