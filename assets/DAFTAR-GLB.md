# Daftar file GLB untuk makhluk dari tool AI

28 November 2026

Simpan setiap file langsung di folder `assets/` dengan nama persis seperti di tabel. Saat `npm run dev` atau `npm run build` dijalankan, file baru otomatis diimpor ke game: ukurannya disamakan dengan tinggi makhluk sekarang, kakinya diletakkan di tanah, dan posisinya ditengahkan. Makhluk yang file-nya belum ada tetap memakai block-out. Impor juga bisa dijalankan sendiri dengan `npm run models:ai`. Kalau sebuah file dihapus dari `assets/`, makhluk itu kembali memakai block-out.

## Dirig dan dianimasikan di Meshy (18 makhluk)

Ekspor GLB berisi tulang dan lima animasi. Nama animasi cukup mengandung kata ini (huruf besar atau kecil tidak masalah): `idle`, `walk` (atau `run`), `attack` (atau `punch`, `slash`, `bite`, `kick`), `hit` (atau `hurt`, `damage`), dan `die` (atau `death`, `dying`). Animasi yang tidak ada diganti `idle`.

| Makhluk | Nama file | Nomor di prompt |
| --- | --- | --- |
| Satyr (peniup suling) | `monster_satyr.glb` | Bagian 1, no. 8 (kanan) |
| Silenus (satir gemuk) | `monster_silenus.glb` | Bagian 1, no. 8 (kiri) |
