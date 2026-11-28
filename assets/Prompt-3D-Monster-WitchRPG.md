# Prompt 2D ke 3D – Monster WitchRPG

28 November 2026

Prompt teks saja tidak akan pernah menghasilkan 3D yang 100% mirip. Kuncinya: selalu upload gambar aslinya sebagai referensi, lalu pakai prompt di dokumen ini untuk mengunci detailnya. Prompt ditulis dalam bahasa Inggris karena kebanyakan tool AI lebih akurat dengan bahasa Inggris.

## Cara pakai agar hasilnya mirip

1. **Crop satu monster per gambar.** Banyak file berisi kolase (misalnya poster 12 monster). Potong tiap monster jadi file sendiri, hapus tulisan labelnya, dan perbesar sampai sisi terpanjang minimal sekitar 1024 px.
2. **Pilih jalur sesuai kebutuhan:**
   - **Jalur A, gambar render 3D** (preview, ilustrasi kartu, concept): pakai tool image-to-image yang menerima gambar referensi, misalnya ChatGPT, Gemini, atau Midjourney dengan image prompt. Upload hasil crop, lalu tempel prompt render.
   - **Jalur B, file model 3D untuk game** (.glb/.fbx/.obj): pakai tool image-to-3D, misalnya Meshy, Tripo, Rodin, atau Hunyuan3D. Di tool ini gambar adalah input utama dan teks hanya pelengkap, jadi pakai Template Model 3D.
3. **Paling akurat: gabungkan A lalu B.** Ukiran kayu (folder Monster pt2) penuh garis arsiran yang sering membingungkan tool image-to-3D. Render dulu ke gambar 3D tampak depan lewat Jalur A, lalu masukkan hasil render itu ke Jalur B. Kalau tool-nya mendukung multi-view, buat juga tampak samping dan belakang dengan menambah kalimat `side view` atau `back view, same character`.
4. **Kalau hasilnya melenceng,** generate ulang 2–4 kali, lalu tambah satu kalimat koreksi yang spesifik di akhir prompt, misalnya `The left foot must be a bird talon`. Jangan rombak seluruh prompt.
5. **Kalau model mau dianimasikan (rigging),** pose netral (A-pose) jauh lebih mudah di-rig, tapi pose jadi tidak sama dengan gambar. Buat dua versi: satu persis seperti gambar untuk ilustrasi, satu A-pose untuk dipakai di game.

## Template universal

Template ini bisa dipakai untuk gambar apa pun di folder. Ganti `[SUBJECT]` dengan deskripsi monster dari Bagian 1–3, dan `[STYLE]` dengan salah satu gaya di bawah.

**Template Render 3D (Jalur A, image-to-image)**

```text
Turn the attached 2D illustration into a 3D render of the same creature. Stay 100% faithful to the reference: identical pose, camera angle, silhouette, proportions, anatomy, number of heads, arms, legs, wings and tails, facial expression, markings and colors. Do not add, remove, redesign or improve any part. Subject: [SUBJECT]. Style: [STYLE]. Full body in frame, single character only, plain light-grey studio background, soft three-point lighting, physically based materials, ultra-detailed, 4K.
```

**Template Model 3D (Jalur B, image-to-3D)**

```text
Game-ready 3D model of [SUBJECT], matching the reference image exactly in shape, pose and proportions. Single object, full body, clean watertight mesh, clean topology, detailed PBR textures (base color, roughness, normal), [STYLE].
```

**Negative prompt** (isi di kolom negative prompt kalau tool-nya punya; kalau tidak, tambahkan `Avoid:` lalu daftar ini di akhir prompt)

```text
extra limbs, missing limbs, extra heads, extra fingers, changed pose, different camera angle, redesigned anatomy, different colors, captions, floating text labels, watermark, signature, picture frame, background scenery, multiple characters, cropped body, cartoon simplification, blurry, low detail
```

**Pilihan gaya untuk `[STYLE]`**

| Gaya | Cocok untuk | Teks yang ditempel |
| --- | --- | --- |
| A. Ukiran hidup | Paling setia ke ukiran kayu Monster pt2 (tetap hitam-putih/sepia) | `stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life, subtle ink outlines` |
| B. Dark fantasy realistis | Ukiran kayu yang ingin diberi warna alami | `realistic dark-fantasy creature, lifelike skin, fur, feathers and scales, natural believable colors, cinematic lighting` |
| C. Ikuti lukisan asli | Gambar berwarna (Bagian 2 dan 3) | `semi-realistic painted fantasy 3D, keep the exact color palette of the reference` |
| D. Aset RPG stylized | Kalau semua monster ingin seragam gayanya di game | `stylized hand-painted fantasy RPG game asset, slightly exaggerated proportions kept from the reference` |

Ukiran kayu aslinya tidak berwarna, jadi gaya B dan D membuat AI memilih warna sendiri. Kalau ingin warna tertentu, tulis langsung di akhir subject, misalnya `greenish-grey scales, amber eyes`.

## Bagian 1: Monster pt2 (ukiran kayu kuno)

Ini 19 prompt siap tempel (18 monster) untuk 15 file di folder Monster pt2. Ukiran dan gravir abad ke-16 sampai ke-19 ini (antara lain dari buku Aldrovandi dan Dictionnaire Infernal) sudah domain publik, jadi aman ditiru persis untuk game.

- Semua prompt memakai gaya A (ukiran hidup). Ganti kalimat `Style:` dengan gaya B atau D kalau ingin berwarna.
- Untuk Jalur B (model 3D), salin teks setelah `Subject:` sampai sebelum `Style:` ke Template Model 3D.
- Beberapa ukiran asli menampilkan tubuh telanjang. Prompt di sini membuat area kelamin polos supaya aman untuk game dan tidak ditolak tool AI.

### 1. Raksasa Alegori Berkepala Banyak

File: `Screenshot 2026-11-28 114251.png`. Kalau tidak butuh dioramanya, hapus kalimat yang diawali `At his feet`.

```text
Turn the attached antique engraving into a 3D render of the same figure. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a towering, heavily muscular nude giant (an allegory of discord) standing in contrapposto on a small rocky base. Five long, serpentine, skin-covered necks rise from his shoulders, each ending in a different head; from the viewer's left to right: a brooding middle-aged man's head in profile, a snarling fox head, a man's head holding a blank pale theatrical mask in front of its face, a screaming face with wild hair, and a bald old man's head in profile. He has four arms: on the viewer's left, the upper hand holds a heavy cloth money sack and the lower hand grips a small dagger and a heart; on the viewer's right, the upper hand holds up an open book and the lower hand holds a sword hilt at the hip. A long ribbon banner with faint Latin lettering wraps diagonally around his waist over a knotted loincloth. Behind his two human legs grow a third, bird-of-prey taloned leg and a furry wolf leg with claws, plus a long bushy fox tail. At his feet: a sleeping cherub child he steps on, a broken sword, an olive branch and a fallen rod of justice. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single figure group, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 2. Monster Bersayap Bertanduk (Fig. XXVIII)

File: `Screenshot 2026-11-28 114307.png`, figur kiri atas.

```text
