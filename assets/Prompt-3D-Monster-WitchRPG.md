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
