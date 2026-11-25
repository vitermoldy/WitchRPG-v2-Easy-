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
