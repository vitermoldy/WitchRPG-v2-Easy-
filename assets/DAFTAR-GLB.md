# Daftar file GLB untuk makhluk dari tool AI

28 November 2026

Simpan setiap file langsung di folder `assets/` dengan nama persis seperti di tabel. Saat `npm run dev` atau `npm run build` dijalankan, file baru otomatis diimpor ke game: ukurannya disamakan dengan tinggi makhluk sekarang, kakinya diletakkan di tanah, dan posisinya ditengahkan. Makhluk yang file-nya belum ada tetap memakai block-out. Impor juga bisa dijalankan sendiri dengan `npm run models:ai`. Kalau sebuah file dihapus dari `assets/`, makhluk itu kembali memakai block-out.

## Dirig dan dianimasikan di Meshy (18 makhluk)

Ekspor GLB berisi tulang dan lima animasi. Nama animasi cukup mengandung kata ini (huruf besar atau kecil tidak masalah): `idle`, `walk` (atau `run`), `attack` (atau `punch`, `slash`, `bite`, `kick`), `hit` (atau `hurt`, `damage`), dan `die` (atau `death`, `dying`). Animasi yang tidak ada diganti `idle`.

| Makhluk | Nama file | Nomor di prompt |
| --- | --- | --- |
| Satyr (peniup suling) | `monster_satyr.glb` | Bagian 1, no. 8 (kanan) |
| Silenus (satir gemuk) | `monster_silenus.glb` | Bagian 1, no. 8 (kiri) |
| Blemmye | `monster_blemmye.glb` | Bagian 1, no. 11 |
| Panotti (bertelinga raksasa) | `monster_panotti.glb` | Bagian 1, no. 10 |
| Silvana (wanita liar) | `monster_silvana.glb` | Bagian 1, no. 12 |
| Leonis (manusia singa) | `monster_leonis.glb` | Bagian 1, no. 13 |
| Cornutus (Fig. XXVIII) | `monster_cornutus.glb` | Bagian 1, no. 2 |
| Cacodaemon (naga-iblis bersayap) | `monster_cacodaemon.glb` | Bagian 1, no. 4 dan 18 |
| Tetrachiron (empat lengan) | `monster_tetrachiron.glb` | Bagian 1, no. 5 |
| Triceps (tiga kepala) | `monster_triceps.glb` | Bagian 1, no. 6 |
| Cracovia (monster Kraków) | `monster_cracovia.glb` | Bagian 1, no. 9 |
| Hippocentaurus (Centaurus aneh) | `monster_hippocentaurus.glb` | Bagian 1, no. 7 |
| Manticore | `monster_manticore.glb` | Bagian 2, Manticore |
| Dragon Hitam | `monster_dragon_hitam.glb` | Bagian 2, Naga hitam |
| Aquilon (manusia elang) | `monster_aquilon.glb` | Bagian 2, Manusia elang |
| Aziza (peri kecil) | `monster_aziza.glb` | Bagian 3, Aziza |
| Kitsune (rubah ekor sembilan) | `monster_kitsune.glb` | Bagian 3, Kitsune |
| Banshee (wanita hantu) | `monster_banshee.glb` | Bagian 3, Banshee |

## Dikirim tanpa tulang, saya rig di Blender (9 makhluk)

Ekspor GLB polos (tanpa rig dan animasi). Sampai saya rig, makhluk ini bergerak sebagai satu badan (bergoyang, condong, menerjang).

| Makhluk | Nama file | Nomor di prompt |
| --- | --- | --- |
| Buer | `monster_buer.glb` | Bagian 1, no. 14 |
| Raia (naga ikan pari) | `monster_raia.glb` | Bagian 1, no. 17 |
| Ravenna (Monster Ravenna) | `monster_ravenna.glb` | Bagian 1, no. 3 |
| Marinus (iblis laut) | `monster_marinus.glb` | Bagian 1, no. 16 |
| Duyung (putri duyung) | `monster_duyung.glb` | Bagian 2, Putri duyung |
| Discordia (raksasa alegori) | `monster_discordia.glb` | Bagian 1, no. 1 |
| Asmodeus | `monster_asmodeus.glb` | Bagian 1, no. 15 |
