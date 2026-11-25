# PREVIZ: WitchRPG v2, Fase 0

Gambaran game sebelum kode ditulis: kamera, skala, palet, dan peran tiap makhluk. Semua isi folder ini dibuat ulang oleh skrip di `previz/blender/`; tidak ada langkah manual di Blender.

```bash
"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" -b --factory-startup -P previz/blender/build.py -- --anim
```

Tanpa `--anim` hanya still yang dirender (sekitar 1 menit). `--only hero,valley` membatasi target, `--pct 50` merender setengah ukuran, `--frame-list 1,300,600` merender frame animatic tertentu untuk dicek. Blender 5.1.2, mesin `BLENDER_EEVEE`, GPU RTX 5070 Ti Laptop.

## Keluaran

| File | Isi |
| --- | --- |
| `renders/00-kamera-varian.png` | Empat varian kamera bahu di tanah lapang yang sama, dasar keputusan angka kamera |
| `renders/01-hero-bahu.png` | Ilyra dari balik bahu kanan dengan angka kamera akhir, delapan Imp di depannya, pagi berkabut |
| `renders/02-lembah-hutan.png` | Lembah dari udara dengan lima zona, warna kabutnya, dan label |
| `renders/03-barisan-makhluk.png` | Semua makhluk dalam skala nyata di tiga pita (sampai 3,2 m, 3,2 sampai 7,5 m, di atas 7,5 m); tiap pita punya Ilyra dan penggaris meter sendiri |
| `renders/04-tempur-minotaur.png` | Tengah pertarungan di Reruntuhan Kuil: ayunan tongkat, Minotaur mengangkat kapak, cincin amber, kamera lock-on |
| `renders/05-boss-hydra.png` | Hydra muncul dari Danau Hitam saat senja, kamera rendah di belakang Ilyra |
| `renders/06-pasukan-bangkit.png` | Malam di Hutan Pembuka: sembilan prajurit bayangan naik dari kolam ungu |
| `renders/07-uji-lembah-bara.png` | Tambahan: uji keterbacaan Imp, Cerberus besar, Phoenix, dan tangan Ilyra di kabut oranye Lembah Bara |
| `animatic.mp4` | 26 detik, 1280 × 720, 24 fps, satu kamera tanpa potongan |
| `papan-makhluk.png` | Per makhluk: referensi pemilik di kiri, block-out di kanan, peran, rank Umbra Rite, zona, tinggi |
| `witchrpg-v2-previz.blend` | Semua adegan: `Pustaka` (makhluk, dunia, prototipe), satu adegan per render, `animatic`, `papan-makhluk` |

Urutan animatic: 0 sampai 7 detik terbang dari selatan ke barat laut di atas lembah; 7 sampai 10,5 detik turun ke bahu Ilyra di tepi Danau Hitam; 10,5 sampai 16 detik berjalan 9 m menyusuri tepi danau; 16 sampai 19 detik Naga rawa muncul dan kamera lock-on; 19 sampai 26 detik Naga menyelam, Hydra naik, lock-on pindah ke kepala tengah dan kamera mundur sambil bergetar.

## Angka kamera akhir

FOV di bawah ini selalu vertikal, sama dengan `PerspectiveCamera.fov` di Three.js. Tinggi diukur dari kaki Ilyra ke pivot kamera; kamera mundur dari pivot sejauh "jarak" dan bergeser ke kanan sejauh "bahu".

| Mode | Jarak | Bahu kanan | Tinggi | FOV vertikal | FOV horizontal 16:9 | Pitch awal |
| --- | --- | --- | --- | --- | --- | --- |
| Normal | 3,4 m | 0,8 m | 1,6 m | 50° | 79° | -6° |
| Bidik (tahan RMB) | 2,0 m | 0,65 m | 1,6 m | 40° | 66° | -4° |
| Lock-on | sama dengan normal, mundur sampai +1,6 m untuk target di atas 6 m | 0,8 m | 1,6 m, turun 0,3 m saat mundur | 50°, naik sampai 56° | | target di 2/3 lebar, 1/3 tinggi dari atas |

Varian yang dibandingkan di `00-kamera-varian.png`:

| Varian | Angka | Hasil |
| --- | --- | --- |
| A | Angka awal prompt: FOV 68 vertikal, 3,4 m, bahu 0,85 m, tinggi 1,65 m | Ilyra sekitar sepertiga tinggi layar, tepi gambar meregang, Imp kecil |
| B | FOV 68 dibaca horizontal (41,6 vertikal) | Ilyra besar dan dekat, tapi kawanan sudah memenuhi seluruh lebar layar; makhluk yang datang dari samping tidak akan terlihat |
| C | Dipilih: FOV 50, 3,4 m, bahu 0,8 m, tinggi 1,6 m, pitch -6° | Ilyra di sepertiga kiri, seluruh kawanan di depan terlihat dengan ruang di kedua sisi |
| D | Mode bidik: FOV 40, 2,0 m, bahu 0,65 m | Bahu dan kepala mengisi kiri; kepala tongkat yang menyala jatuh tepat di tengah dan menutupi target (lihat temuan) |

Kamera tidak pernah memotong: animatic membuktikan transisi dari udara ke bahu sebagai satu gerakan. Tabrakan kamera dengan pohon belum diuji di previz; itu gerbang Fase 1.

## Skala makhluk

Tinggi total diukur dari block-out (termasuk tanduk dan sayap yang terangkat; Ilyra tanpa tongkat). Badan adalah tinggi bahu untuk makhluk berkaki empat dan tinggi sampai puncak kepala untuk makhluk tegak. Lebar sudah termasuk bentang sayap. Radius tabrakan adalah usulan untuk kapsul di Fase 1 (v1 memakai 0,38 m untuk Ilyra).

| Makhluk | Tinggi total | Badan | Panjang | Lebar | Radius usulan | Segitiga block-out | Anggaran | Zona |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ilyra | 1,72 m | 1,70 m | 1,01 m | 1,06 m | 0,38 m | 6.806 | 20.000 | semua |
| Imp | 1,64 m (ujung ekor) | 1,05 m, membungkuk | 1,04 m | 1,45 m | 0,40 m | 5.384 | 8.000 | I |
| Hellhound | 1,82 m | bahu 1,0 m | 3,20 m | 1,25 m | 0,50 m | **9.398** | 8.000 | I |
| Harpy | 1,86 m | 1,65 m | 0,92 m | 4,30 m | 0,55 m | 5.184 | 8.000 | II |
| Centaur | 2,81 m | gumba 1,5 m | 2,57 m | 2,07 m | 0,80 m | **9.768** | 8.000 | II |
| Naga rawa | 3,16 m | tubuh ular 7 m | 3,89 m | 2,86 m | 0,60 m | 3.334 | 8.000 | III |
| Minotaur | 3,08 m | 2,75 m | 1,67 m | 2,97 m | 0,75 m | 7.534 | 8.000 | IV |
| Cyclops | 4,08 m | 4,2 m | 2,45 m | 3,50 m | 1,10 m | **8.504** | 8.000 | IV |
| Medusa | 2,48 m | 2,2 m | 1,89 m | 2,11 m | 0,80 m | 15.928 | 30.000 (mini-boss) | III |
| Chimera | 4,47 m | bahu 2,3 m | 4,98 m | 1,94 m | 1,30 m | 8.394 | 30.000 (mini-boss) | III |
| Succubus | 2,66 m | 1,95 m | 2,01 m | 3,15 m | 0,50 m | 5.892 | 8.000 | IV |
| Incubus | 3,05 m | 2,25 m | 2,30 m | 3,54 m | 0,60 m | 6.732 | 8.000 | IV |
| Griffin | 4,63 m | bahu 2,0 m | 4,90 m | 6,24 m | 1,20 m | 5.648 | 8.000 | II |
| Hippogriff | 2,93 m | bahu 1,9 m | 4,14 m | 3,05 m | 1,10 m | 5.464 | 8.000 | II |
| Phoenix | 3,97 m | 2,1 m | 3,70 m | 5,15 m | 0,90 m | 3.006 | 8.000 | V |
| Dragon | 10,43 m | bahu 3,8 m | 20,69 m | 18,73 m | 3,50 m | 6.844 | 30.000 | V |
| Hydra | 14,34 m | tubuh 7 × 9 m | 18,82 m | 12,04 m | 5,0 m tubuh | 15.482 | 30.000 | Danau Hitam |
| Cerberus besar | 7,62 m | bahu 5,0 m | 13,06 m | 5,74 m | 2,50 m | 9.926 | 30.000 | V |
| Lilith | 3,15 m | 2,5 m | 2,59 m | 3,85 m | 0,80 m | 6.096 | 30.000 | V |
| Typhon | 17,25 m | 16 m | 17,70 m | 24,47 m | 6,0 m | 20.040 | 30.000 | cadangan |
| Samael | 7,07 m | 3,2 m | 3,04 m | 5,83 m | 0,80 m | 5.526 | 30.000 | cadangan |
| Atlas | 13,42 m | 9 m | 5,40 m | 7,55 m | 2,20 m | 6.016 | 30.000 | cadangan |
| Pegasus | 3,96 m | gumba 1,65 m | 3,33 m | 4,33 m | 0,80 m | 5.592 | 8.000 | seluruh hutan |
| Unicorn | 2,95 m | gumba 1,65 m | 3,33 m | 0,55 m | 0,70 m | 5.300 | 8.000 | altar |

Tiga block-out melewati anggaran mob (dicetak tebal): Hellhound, Centaur, dan Cyclops, karena kepala bergigi, gelang, tali, perisai, dan ekor ular yang ditambahkan supaya mirip referensi. Penyebab utamanya bola penuh di setiap sendi dan cincin aksesori; model akhir di Fase 6 harus memangkasnya ke bawah 8.000. Semua boss dan Ilyra di bawah anggaran.

## Anggaran poligon dunia

Dihitung oleh `build.py` dari dunia previz (medan 1.300 × 1.300 m, titik tiap 2,5 m).

| Bagian | Jumlah | Segitiga per buah | Total segitiga |
| --- | --- | --- | --- |
| Medan | 1 | | 540.800 |
| Pinus | 5.512 | 132 | 727.584 |
| Pinus tinggi | 2.942 | 168 | 494.256 |
| Pinus hangat (tebing) | 305 | 114 | 34.770 |
| Birch | 2.567 | 472 | 1.211.624 |
| Pohon rawa | 1.078 | 1.120 | 1.207.360 |
| Pohon mati | 772 | 288 | 222.336 |
| Pohon terbakar | 471 | 288 | 135.648 |
| Batu kecil dan besar | 1.670 | 20 | 33.400 |
| Rumput (hanya di sekitar lokasi shot) | 9.953 | 48 | 477.744 |
| Pakis (hanya di sekitar lokasi shot) | 816 | 252 | 205.632 |

Total 13.647 pohon dan sekitar 4,0 juta segitiga pohon untuk seluruh peta. Itu terlalu banyak untuk digambar sekaligus di Three.js; sasaran Fase 1: pohon per chunk dengan culling, LOD dua tingkat (model penuh sampai sekitar 120 m, siluet sederhana sampai jarak kabut), dan tajuk birch serta pohon rawa dipangkas ke separuhnya. Rumput dan pakis di game hanya muncul dalam radius kecil di sekitar Ilyra. Anggaran model dari prompt tetap: mob ≤ 8.000, boss ≤ 30.000, Ilyra ≤ 20.000 segitiga, satu sampai tiga material, rig ≤ 40 tulang atau bagian bernama.

## Palet

Warna identitas dari v1 tetap: Chaos `#ff2a3d` (tangan kiri, sigil tongkat, jejak ayunan), Umbra `#8f55ff` (tangan kanan, bayangan, kolam), amber musuh `#ffa53d` (mata musuh, cincin telegraf). Tambahan v2: cahaya altar teal `#9ff2e0`, retakan Rift di langit `#ff5a2a` dengan inti `#ffd2a0`.

Makhluk memakai warna dari gambar referensinya (keputusan pemilik setelah previz pertama), dua nada: warna atas untuk punggung, warna bawah untuk perut dan sisi yang menghadap tanah.

| Makhluk | Warna utama | Warna lain dan atribut |
| --- | --- | --- |
| Imp | kulit pucat `#e8d2c8` | sayap selaput merah muda `#e6a0c4`, ekor cambuk berujung sekop |
| Hellhound | hitam kebiruan `#1c2232` | urat menyala cyan `#46e6ff`, mata cyan, ekor ular |
| Harpy | kulit `#dcae94` | bulu putih `#f3f6fa` berujung biru `#3d6fb6`, kaki burung `#a8703c` |
| Centaur | badan kuda `#7a3e22` | manusia tua kulit `#d9a37a`, rambut dan janggut putih, ekor `#e8a878`, gelang emas |
| Naga rawa | hijau `#2f6b55`, perut emas `#d9c06a` | jengger oranye `#d0803a`, duri `#c8502a`, sungut |
| Minotaur | merah cokelat `#9c4c30` | tanduk `#ece2c8`, bulu kaki `#4a2418`, rok kulit `#3a2a20`, dua kapak perak |
| Cyclops | kulit `#d49a6a` | cawat bulu `#6a4a30`, tali `#4a3020`, perisai kayu, sabuk tengkorak |
| Medusa | kulit hijau `#86bb62` | rambut ular tembaga `#c47a3a`, ekor `#8aa040`, gaun putih `#f2efe6`, emas |
| Chimera | singa `#b8843c` | surai krem `#e8dcc0`, kepala kambing `#8a7c6c`, ekor ular biru `#2b4a8c` perut emas |
| Succubus, Incubus | kulit abu pucat `#cfc9d2`, `#a9a1aa` | rambut putih, zirah `#2b2731`, sayap `#8a3e52`, permata hijau `#5fe0a0` |
| Griffin | singa `#c39256` | kepala dan sayap elang `#8a5a34`, `#6e4a2c`, paruh `#e0b040` |
| Hippogriff | kuda `#9a7a52` | kepala dan sayap elang `#a07a48`, sayap terlipat |
| Phoenix | merah api `#d0381c` | sayap ke jingga `#ffb030`, ekor menyala `#ffd060` (beremisi) |
| Dragon | merah `#9a2618`, perut `#d8a878` | selaput sayap `#d89a6a`, duri `#6a160e` |
| Hydra | hijau abu `#56664c`, perut `#a0a884` | sirip kepala `#a0aca0`, duri `#3e4a38` |
| Cerberus besar | ungu keabuan `#9a92ae` | kalung hitam `#1c1c20` berduri perak, mulut merah |
| Lilith | kulit `#e2b9a2` | gaun ungu `#4b3b7c`, naga ular merah `#b02a20`, sayap `#3a1a20` |
| Typhon | emas jingga `#d0903a` | janggut abu `#4a4a4a`, sayap abu `#6a6a72`, kaki ular `#b07a30` |
| Samael | kulit `#e6c8b0` | rambut putih, sayap putih keemasan `#f4eee0`, jubah merah `#a02a20`, pedang bercahaya |
| Atlas | kulit `#c8905a` | janggut putih, cawat putih, bola dunia biru `#2a6aa8` dan hijau `#4f8a3a` |
| Pegasus | putih `#f6f6f8` | sayap dan surai putih |
| Unicorn | biru abu `#8aa6c4` | surai mawar `#c87898`, tanduk gading `#f2ead8` |

| Zona | Tier, level | Kabut | Kepadatan di tanah, skala tinggi | Tanah | Vegetasi, kepadatan pohon per 100 m² |
| --- | --- | --- | --- | --- | --- |
| Hutan Pembuka | I, 1-3 | `#cddbea` putih kebiruan | 0,014, 10 m | `#2a3322` | pinus 45%, pinus tinggi 20%, birch 35%; 2,4 |
| Tebing Berangin | II, 4-6 | `#e9c79c` tipis hangat | 0,006, 30 m | `#5b5141` | pinus hangat 70%, pinus 30%; 0,32; batu besar di lereng |
| Rawa Berkabut | III, 7-9 | `#a9c491` hijau pucat | 0,030, 9 m | `#283224` | pohon rawa berakar tinggi 55%, pohon mati 30%, pinus 15%; 0,95 |
| Danau Hitam | III, sarang Hydra | `#a3b996` rendah di atas air | 0,012, 5 m | air `#06090b` | pohon rawa di tepi |
| Reruntuhan Kuil | IV, 10-12 | `#8f9096` abu | 0,020, 14 m | `#373a33` | pinus 50%, pinus tinggi 35%, birch 15%; 1,3; kuil batu di tengah |
| Lembah Bara | V, 13-15 | `#d8622c` oranye kemerahan | 0,018, 28 m | `#1d1917` dengan bara `#ff5a1f` | pohon terbakar 85%, pohon mati 15%; 0,85; Rift di langit, 2.500 bara melayang |

Kabut tiap zona memancarkan sedikit warnanya sendiri (emisi = kepadatan × 0,5) supaya tetap terbaca di tempat teduh dan dari jauh. Seluruh lembah ditutup haze tipis `#b9c8da` dengan kepadatan 0,00025.

Cahaya per render: 01 pagi, matahari `#ffe9cc` 22° di atas cakrawala, 50° di kiri arah pandang, plus haze lokal tanpa emisi supaya tajuk memotongnya menjadi berkas cahaya. 02 siang dari tenggara. 04 mendung terang dari timur. 05 dan animatic senja, matahari `#ff9a5a` 4° di belakang Hydra, langit `#1d1a3e` ke `#ff8f52`. 06 malam, bulan `#9fb4ff` dan kolam ungu sebagai sumber cahaya utama.

## Tata letak peta

X ke timur, Y ke utara, meter, pusat peta (0, 0).

| Tempat | Pusat | Radius | Bentuk medan |
| --- | --- | --- | --- |
| Hutan Pembuka | (0, -280) | 230 | bergelombang 3 sampai 8 m |
| Altar awal | (-10, -395) | | lingkar tujuh batu tegak |
| Tebing Berangin | (320, -40) | 190 | dataran tinggi naik 36 sampai 42 m, tepi tebing patah |
| Rawa Berkabut | (-300, 40) | 200 | rata di garis air, kolam di bawah 0 m |
| Danau Hitam | (-330, 300) | 95 | dalam 7 m, tepi curam di sekitar 93 m dari pusat |
| Sarang Hydra | (-275, 239) | | 18 m dari titik tepi tempat Ilyra berdiri (-263, 226) |
| Reruntuhan Kuil | (40, 330) | 170 | naik 12 m, pelataran kuil rata di (40, 318) |
| Lembah Bara | (330, 330) | 165 | cekungan turun 7 m dengan bibir |
| Cincin gunung | dari 440 m ke luar di sumbu x atau y | | naik 110 sampai 180 m |

Jalan setapak: altar ke utara melewati Hutan Pembuka sampai kuil, bercabang ke barat menuju rawa dan danau, ke timur menuju tebing, dan ke timur laut menuju Lembah Bara.

## Yang saya ubah dari prompt

| Bagian | Prompt | Previz | Alasan |
| --- | --- | --- | --- |
| Kamera normal | FOV 68, 3,4 m, bahu 0,85 m, tinggi 1,65 m | FOV 50 vertikal, 3,4 m, bahu 0,8 m, tinggi 1,6 m, pitch -6° | Lihat tabel varian |
| Mode bidik | FOV 54, 2,0 m, 0,65 m | FOV 40, 2,0 m, 0,65 m | Membidik harus lebih sempit dari mode normal yang baru |
| Naga rawa dan Dragon | Mengacu pada gambar berlabel sama | Naga rawa memakai siluet gambar "Dragon" (ular Timur), Dragon memakai siluet gambar "Naga" (bersayap) | Label di lembar referensi tertukar dibanding peran di roster |
| Hydra | Berkepala banyak | Lima kepala | Bisa dihitung pemain, sesuai referensi |
