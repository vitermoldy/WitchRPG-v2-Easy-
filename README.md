# Crimson Sovereign: Hutan, versi Easy (WitchRPG v2 Easy)

Salinan [WitchRPG v2](../WitchRPG-v2) dengan satu perbedaan: **setiap Umbra Rite berhasil (100%)**, jadi semua tubuh yang bersinar bangkit menjadi bayangan, dari Imp sampai boss Marsekal. Syarat rank tetap: Jenderal butuh Kebangkitan Jenderal, Marsekal butuh Kebangkitan Marsekal. Versi Easy punya port, database (`witch_rpg_v2_easy`), cookie akun, dan simpanan browser sendiri, jadi bisa dijalankan berdampingan dengan versi biasa. Saat dibuat (26 Nov 2026), akun dan isi `witch_rpg_v2` disalin ke sini: akun `vmk` dengan witch Lv 15, 125 bayangan, 7 altar menyala, dan 5 boss tumbang. Setelah itu keduanya berjalan sendiri-sendiri.

Action-RPG third-person di hutan terbuka. Kamu bermain sebagai Ilyra dari balik bahu kanannya: tangan kirinya membengkokkan realitas dengan sihir Chaos, tangan kanannya membangkitkan musuh yang kalah menjadi pasukan bayangan. Sistem gameplay mengikuti [WitchRPG v1](../WitchRPG); rasa kamera dan tempurnya mengacu pada game aksi third-person berbobot.

Game ini dibangun per fase menurut [PROMPT.md](./PROMPT.md). Keputusan desain ada di [DESIGN.md](./DESIGN.md), gambaran awal di Blender (render, animatic, papan makhluk) di [previz/](./previz/PREVIZ.md).

| Fase | Isi | Status |
| --- | --- | --- |
| 0. Previz | Gambaran game di Blender: kamera, skala, palet, block-out semua makhluk | Selesai |
| 1. Fondasi | Lembah hutan 1 km dengan lima zona, kamera bahu, gerak, dodge, mode bidik, lock-on | Selesai |
| 2. Tempur | Kombo tongkat, parry, Eksekusi, sihir Chaos, Imp, Hellhound, Harpy | Selesai |
| 3. Umbra | Umbra Rite, pasukan bayangan | Selesai |
| 4. Dunia dan progresi | Zona I sampai III, altar, Ledger, Centaur, Naga rawa, Minotaur, Medusa, Chimera | Selesai |
| 5. Boss | Hydra tiga fase, zona IV dan V, Cyclops, Succubus, Incubus, Phoenix, makhluk elit | Selesai |
| 6. Poles | Model dengan warna dua nada, suara dan suasana per zona, partikel dan Rift di langit, akun dan simpanan server, ukuran performa | Selesai |

Setelah fase 6, atas permintaan pemilik: terbang, pandangan orang pertama, peta, seluruh roster makhluk (enam boss dunia, Griffin, Hippogriff, dan satwa), kamp dan kawanan yang lebih banyak, dan boss yang bangkit lagi setiap 45 detik.

## Menjalankan

Butuh Node 22 atau lebih baru dan browser dengan WebGL 2.

```bash
npm install
npm run dev      # http://localhost:5301
npm run server   # server akun dan simpanan, port 8915 (butuh MySQL dan .env)
npm test         # tes progresi v1, kamera, gerak, peta, tempur, AI makhluk, simpanan, dan Hydra
npm run build    # hasil di dist/
npm start        # setelah build: server sekaligus melayani dist/ di http://localhost:8915
npm run users    # daftar akun
npm run set-user -- <username> <kata sandi>   # buat akun atau ganti kata sandinya
npm run models   # buat ulang model GLB dari block-out Blender (butuh Blender 5.1)
npm run models -- imp hellhound harpy --lod 0.22   # versi sederhana untuk kerumunan bayangan
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
| M | Peta: semua boss dan statusnya, altar, dan kamp monster yang dicentang. Game menunggu selama peta terbuka |
| Tab | Ledger: bagi poin stat dan skill, lihat dan lepas bayangan. Game menunggu selama Ledger terbuka |
| F di altar | Perjalanan cepat ke altar lain yang sudah menyala, atau buka Ledger |
| Esc | Jeda: sensitivitas, volume, bayangan detail penuh, guncangan kamera |

| Tempur | |
| --- | --- |
| Klik kiri | Tiga pukulan tongkat berantai; tahan untuk pukulan berat |
| Tahan C | Tahan serangan dari depan. Tekan tepat saat cincin amber penuh untuk parry: makhluk limbung |
| F | Eksekusi makhluk yang limbung; tubuhnya lebih mudah dibangkitkan (+15%) |
| H | Lempar tongkat ke titik bidik atau target lock-on; tekan lagi untuk memanggilnya, mengenai makhluk di jalur pulang |

