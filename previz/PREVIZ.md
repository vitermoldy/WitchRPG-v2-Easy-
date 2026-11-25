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
