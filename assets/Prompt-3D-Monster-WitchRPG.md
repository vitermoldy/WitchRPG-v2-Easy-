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
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a stocky winged humanoid monster standing upright on a small grassy mound. Round, grinning cat-like face with small round ears and one short horn on top of the head. Two large feathered bird wings spread from the shoulders. Muscular human torso with symbols carved into the chest skin: an X above two V shapes, and a small crescent below. Smooth, non-explicit groin. Both legs are covered in fish scales from the knees down; the foot on the viewer's left is a bird-of-prey talon, the other is a human foot. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 3. Monster Ravenna (Fig. XXVII)

File: `Screenshot 2026-11-28 114307.png`, figur kanan atas.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: the Monster of Ravenna, a slender androgynous youth with short hair, a calm face and one small horn on top of the head. Two large feathered wings grow from the shoulders in place of arms. A Y-shaped mark and a small cross are carved on the chest. From the hips down the body is covered in overlapping fish scales and tapers into a single leg, with an eye on the knee, ending in one bird-of-prey talon foot. Standing on a small round mound. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 4. Iblis Bersayap Bermoncong (Fig. XXVI)

File: `Screenshot 2026-11-28 114307.png`, figur bawah.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a winged horned demon walking upright on its hind legs, body hunched forward. Long snouted dog-like head with a toothy grin, a short horn curling back and a tuft of curly hair. One large membranous bat wing raised behind the back. Thin arms reaching forward with long hooked claws. Lean body, digitigrade dog-like hind legs with shaggy fur on the shins and clawed feet, a long thin tail curving behind. Standing on a grassy mound. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 5. Monster Bertangan Empat (Fig. XXXI)

File: `Screenshot 2026-11-28 114315.png`, figur atas.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a four-armed winged monster with a human head: a bearded man's face with two pointed animal ears and two short curved horns. Four human arms stretched out sideways in two pairs, each ending in a clenched fist, with tufts of fur at the shoulders. Two large feathered wings spread from the waist. The lower body is wrapped in shaggy feathers like a bird's, standing on two thin goat legs with cloven hooves on a small round mound. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 6. Monster Tiga Kepala: Rubah, Naga, Elang (Fig. XXXII)

File: `Screenshot 2026-11-28 114704.png` (paling jelas, pakai ini). Figur bawah di `114315.png` adalah makhluk yang sama tapi terbalik kiri-kanan; kalau memakai file itu, tukar kata left dan right.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a three-headed monster standing upright. Three long necks rise from the shoulders: a fox head on the viewer's left, a crested dragon head on a long scaly neck in the middle, and an eagle head with a feathered neck on the right. The arm on the viewer's left ends in an open human hand; the arm on the right is raised and ends in bird talons. The whole body and legs are covered in overlapping fish scales; a feathery tuft sprouts at the hips; the feet are bird-of-prey talons. Standing on a small mound. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 7. Centaurus

File: `Screenshot 2026-11-28 114323.png`, figur atas.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a bizarre centaur: a massive, hairy, bearded man's torso with a stern face and arms crossed over the chest, joined directly to the front of a very long, smooth, bloated horse body with no horse neck, standing on thin horse legs with hooves, with a long, wavy, flowing horse tail. Keep the odd, elongated proportions of the woodcut. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 8. Dua Satir

File: `Screenshot 2026-11-28 114323.png`, dua figur bawah. Buat satu per satu supaya tiap model terpisah.

Satir gemuk (kiri):

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a plump satyr with small curved horns and a bearded human face, a human upper body with a round pot belly and sagging chest, pointing forward with one hand, shaggy goat legs with cloven hooves, standing on uneven ground. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

Satir kurus peniup suling (kanan):

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a small, lean satyr with a long goat-like face, pointed ears and two small horns, human arms holding a long pipe to its mouth, shaggy goat legs with cloven hooves, standing on uneven ground. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 9. Monster Kraków

File: `Screenshot 2026-11-28 114352.png`.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: the Monster of Krakow, a nude, plump humanoid standing frontally with arms spread. Bald round head, a long curved elephant-like trunk for a nose, two small flame-shaped growths jutting sideways from the eyes, and floppy animal ears. Dog heads grow out of both elbows; two small fox heads grow from the chest where the nipples would be; a second face (two eyes, with the navel as a mouth) sits on the belly; dog heads grow from both knees. Hands with long clawed fingers. Webbed bird feet like a swan's. A long thin tail rises behind and curves up over the head, ending in a hook. Smooth, non-explicit groin. Standing on a grassy mound. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 10. Manusia Bertelinga Raksasa (Homo Fanesius auritus)

File: `Screenshot 2026-11-28 114409.png`.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a man with gigantic ears: each ear is a huge flap of skin hanging from the side of the head down past the knees, draping around the body like a cloak. Short hair, calm face, slim nude body, one arm hanging relaxed and the other hand holding the edge of an ear. Smooth, non-explicit groin. Mid-stride on a small rocky mound. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 11. Blemmyae (manusia tanpa kepala)

File: `Screenshot 2026-11-28 114414.png`.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a Blemmyae, a headless man whose face sits on his chest: two eyes at the top of the torso, a nose, a mustache and a mouth in the middle of the chest. No neck, rounded shoulders, long dangling arms, stocky nude body with a non-explicit groin, walking with one leg forward, bare feet, on a flat oval patch of ground. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 12. Wanita Liar Berambut Kusut

File: `Screenshot 2026-11-28 114425.png`.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a grotesque, non-sexual wild-woman monster: a mane of long, wild, spiky black hair bursting out in all directions around a weary human face. Stocky body with a round belly. Two extremely long, sagging, rope-like breasts hang down to the thighs, one of them slung over the shoulder. Thin arms with long, crooked, claw-like fingers. Hairy shins, standing with legs apart on a small grassy mound with bushes. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 13. Manusia Singa Berpedang

File: `Screenshot 2026-11-28 114433.png`.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a lion-faced humanoid monster: a huge spiky lion mane around a small, calm lion face. Human body with a sagging chest and a round pot belly, standing upright in a slight stride. One hand rests on a long straight sword planted point-down on the ground; a long thin tail curls on the ground behind. Feet with long, splayed, claw-like toes. Smooth, non-explicit groin. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 14. Buer

File: `Screenshot 2026-11-28 114440.png`.

```text
Turn the attached antique engraving into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: the demon Buer from the Dictionnaire Infernal: a lion's head with a thick shaggy mane and a grimacing face with the tongue sticking out sits at the centre, with no torso; five goat legs with cloven hooves radiate from the head like the spokes of a wheel, as if the creature is rolling. Shaggy fur tufts at the joints. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 15. Asmodeus

File: `Screenshot 2026-11-28 114448.png`.

```text
Turn the attached antique engraving into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: the demon Asmodeus from the Dictionnaire Infernal, riding a beast. He has three heads side by side: a bull head with short horns on the viewer's left, a scowling bearded human face with fangs and an ornate spiked crown in the centre, breathing rays of fire, and a ram head with curled horns on the right. Large bat wings rise behind him. Muscular human arms, legs ending in rooster claws, a coiled serpent tail. He sits astride a crouching, scaly dragon-like beast with heavy clawed paws and a snarling lion-like face. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single figure group, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 16. Iblis Laut

File: `Screenshot 2026-11-28 114627.png`.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a sea demon with a goat-like demonic head, two long curved horns, pointed fin-like ears, bulging eyes and a wide fanged mouth with long whisker-like barbels. Muscular human torso with a sagging chest, two human arms, spiky fins along the forearms and the back. From the waist down, a long scaly fish tail with small side fins and a forked tail fin, curving up behind. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 17. Naga dari Ikan Pari (Draco ex Raia)

File: `Screenshot 2026-11-28 114648.png`. Ini "Jenny Haniver", naga palsu dari ikan pari yang dikeringkan.

```text
Turn the attached antique engraving into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a small dragon made from a dried skate (a Jenny Haniver): broad, ribbed, fan-like ray wings spread wide on both sides; a short pointed conical head with two round eyes and a gaping, downturned mouth like a frightened face; a bulbous, pouch-like body with folded, wrinkled skin; a long thin whip tail with fringed spines and a small fin near the tip. Dry leathery texture. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

### 18. Naga-Iblis Bersayap

File: `Screenshot 2026-11-28 114708.png`.

```text
Turn the attached antique woodcut into a 3D render of the same creature. Keep it 100% identical to the reference in pose, camera angle, proportions, anatomy and every detail; add nothing, remove nothing. Subject: a winged dragon-demon standing upright on its hind legs: a long snouted lizard-like head with a slightly open mouth, a curled ram-like horn and a crest of curly hair. Two scrawny arms reaching forward with long hooked talons. Two small fleshy sacs hanging from the chest. One large membranous bat-like wing with dark spots and ribbed veins. Lean body, long thin legs with shaggy fur on the thighs, bird-of-prey talon feet, and a long thin tail curling down to the ground. Standing on a grassy mound. Style: stylized 3D, ivory parchment-colored surfaces with black ink cross-hatching engraved into the texture, like an antique woodcut brought to life. Full body, single character, plain light-grey background, soft studio lighting, ultra-detailed, 4K.
```

## Bagian 2: Monster dari gambar berwarna

Tabel ini berisi 34 deskripsi untuk monster di file berwarna. Tempel teks kolom Subject ke `[SUBJECT]` di Template Render atau Template Model 3D, dan pakai gaya C supaya warnanya mengikuti gambar.

Gambar-gambar ini karya seniman atau studio modern (lukisan digital, poster kaos, art game). Makhluk mitologinya milik umum, tapi menyalin desainnya 1:1 untuk game yang dirilis bisa melanggar hak cipta. Paling aman pakai sebagai referensi, lalu ubah sedikit warna, ornamen, atau posenya.

| Makhluk | File | Subject |
| --- | --- | --- |
| Pegasus pink | `167518dd…jpg`, panel Pegasus | a rearing winged horse with a pale pink-white coat, a long flowing teal-green mane and tail, huge feathered wings raised high, front hooves lifted, standing on a pink crystal rock |
| Pegasus putih (menyerbu) | `images (4).jpg`, kanan atas | a pure white winged horse charging toward the viewer, wings spread wide, mane flying |
| Pegasus putih (melompat) | `z0jfasz4aizd1.jpeg` | a white winged horse leaping with wings raised high and a curly white mane and tail |
| Unicorn | `167518dd…jpg`, panel Unicorn | a slender rearing horse with a blue-grey speckled coat, a long auburn mane and tail and a long spiral horn, on a dark rocky hill |
| Harpy gelap | `167518dd…jpg`, panel Harpies | a harpy with a dark brown feathered body, huge spread wings, a woman's face and torso and bird-of-prey talons, seen from the front |
| Harpy biru-putih | `z0jfasz4aizd1.jpeg` | a screaming harpy woman with a feathered crown, blue-and-white feathered wings with clawed hands, a short feather skirt and bird legs with talons |
| Griffin cokelat | `167518dd…jpg`, panel Griffin | a griffin with a golden eagle head, huge brown spread wings and a tawny lion body, perched on a rock with its talons gripping it |
| Griffin putih-emas | `z0jfasz4aizd1.jpeg` | a rearing griffin with a white-and-gold eagle head, white wings, a golden lion body and a tufted tail, talons raised |
| Hippogriff | `167518dd…jpg`, panel Hippogriff | a hippogriff: the front half a giant eagle with brown-gold feathers and talons, the back half a horse, wearing a bridle and saddle (rider optional) |
| Naga Timur | `167518dd…jpg`, panel Dragon | a long serpentine Eastern dragon with green-gold scales, a golden mane, antlers, whiskers and four small clawed legs, its body coiling in loops |
| Naga merah | `167518dd…jpg`, panel berlabel Naga (isinya naga barat, bukan naga ular) | a red Western dragon with crimson scales, cream wing membranes, a spiky horned head and dorsal spikes, standing on four legs on a cliff |
| Naga hitam | `images (4).jpg`, kanan bawah | a black dragon with a crown of long spikes, a long neck, dark ridged scales and folded membrane wings |
| Imp | `167518dd…jpg`, panel Imp | an imp: a thin, pale humanoid with long limbs, bat wings with pink membranes and a long segmented tail ending in a barb, arched above its body |
| Phoenix | `167518dd…jpg`, panel Phoenix | a phoenix: a firebird with crimson-orange feathers, wings spread wide and long flame-like tail plumes trailing embers |
| Incubus | `167518dd…jpg`, kiri | an incubus: a tall male demon in dark spiked armor, long curved horns, pale grey skin, huge bat wings with torn holes and glowing green gems |
| Succubus | `167518dd…jpg`, kanan | a succubus: a slender female demon with white hair, curved horns, a dark armored bodysuit, huge bat wings with torn holes and glowing green gems |
| Lilith | `167518dd…jpg`, panel Lilith | Lilith: a woman with long dark hair in a flowing purple gown, dark bat wings, a red serpentine dragon coiled around her body, holding a red apple |
| Samael | `167518dd…jpg`, panel Samael | Samael: a fallen angel with long white hair, a bare muscular torso, a red scarf, huge tattered pale wings and one arm raised holding a glowing blade |
| Hydra laut | `images (1).jpg` | a hydra rising from a small patch of murky green water: several long serpent necks with dark green stripes, each head armored like a fish-dragon with spiky fin crests and fangs, dripping water |
| Hydra hijau | `z0jfasz4aizd1.jpeg` | a green hydra with five snake heads with red-orange fin crests on one four-legged reptile body with a long tail |
| Cerberus biru menyala | `images (2).jpg` | a three-headed hellhound standing upright, dark blue-black armored hide with glowing cyan cracks and cyan eyes, open fanged mouths with long tongues and a snake for a tail |
| Cerberus ungu | `z0jfasz4aizd1.jpeg` | Cerberus: a three-headed lavender-grey dog with spiked collars and snarling red mouths, a muscular body on four legs |
| Chimera emas | `images (5).jpg` | a chimera: a muscular, hunched golden-brown beast with a snarling goat-like head with long curved horns and a white mane, a second lion head below it, clawed feet and a long blue-and-gold cobra tail arching over its back with an open fanged mouth |
| Chimera poster | `z0jfasz4aizd1.jpeg` | a chimera: a lion with a red mane, a grey goat head with curved horns rising from its back and a green snake for a tail |
| Manticore | `images (6).jpg`, kiri | a manticore: a lion-like beast standing on its hind legs with a shaggy mane and lion face, dark ragged feathered wings, clawed hands and a long scaly tail ending in a small dragon head |
| Kepala iblis tanduk domba | `images (6).jpg`, kanan (hanya kepala yang terlihat) | a monstrous head and neck with huge curled ram horns, a bony skull-like face, a yellow eye, rows of jagged fangs and white bristly fur |
| Manusia elang | `images (4).jpg`, kiri atas | an eagle-headed warrior: a muscular armored humanoid with a white-feathered eagle head, gold-trimmed armor and a flowing cape |
| Putri duyung | `images (4).jpg`, kiri bawah | a mermaid with long dark hair covering her chest, pale skin and a dark scaly fish tail, sitting on a rock |
| Centaur pemanah | `z0jfasz4aizd1.jpeg` | a centaur archer: an old man with long white hair and beard, a muscular torso with leather straps and gold armbands, drawing a bow, on a brown horse body with a pale tail |
| Minotaur | `z0jfasz4aizd1.jpeg` | a minotaur: a muscular bull-headed man with long horns, a leather belt and strap skirt, wrist bands, hooves and a double-headed axe in each hand |
| Medusa | `z0jfasz4aizd1.jpeg` | Medusa: a green-skinned woman with snakes for hair, a white Greek dress with gold trim and a green snake tail for a lower body |
| Cyclops | `z0jfasz4aizd1.jpeg` | a cyclops: a huge bald muscular man with one eye, leather straps crossing his chest, a belt with a skull buckle, a loincloth, sandals and a wooden club |
| Atlas | `z0jfasz4aizd1.jpeg` | Atlas: a muscular old titan with white hair and beard in a white loincloth, carrying the globe on his shoulders |
| Typhon | `z0jfasz4aizd1.jpeg` | Typhon: a giant with a dark beard and a horned crown, bat wings, a golden muscular body, arms raised with snakes for fingers and a lower body of serpent coils |

## Bagian 3: Poster Alluring Mythical Creatures

Poster `images (7).jpg` berisi 35 makhluk kecil, kebanyakan berwujud manusia, bukan monster. Gambarnya hanya 640×480 px, jadi tiap makhluk perlu di-crop dan diperbesar dulu, dan hasilnya akan lebih bergantung pada teks Subject. Pakai Template Render dengan gaya C. Catatan hak cipta di Bagian 2 juga berlaku untuk poster ini.

| Makhluk | Subject |
| --- | --- |
| Mermaid | a mermaid with long golden hair and a red shell top, holding a conch shell, with a teal-green scaly fish tail |
| Unicorn | a white unicorn with a flowing white mane whose hind body becomes a long fish-like tail dissolving into sparkles |
| Fairy | a slender fairy with dark hair in a flowing white dress, with large translucent grey insect wings |
| Pegasus | a white winged horse with large feathered wings, its hind body dissolving into particles |
| Phoenix | a phoenix with fiery red-orange feathers and wings spread wide |
| Veela | a woman with long wavy brown hair and a leafy crown in a white dress wrapped with green vines |
| Sphinx | a sphinx lying down: a sandy-beige lion body with a calm face and a lion-like mane |
| Rainbow Serpent | a coiled serpent with rainbow-colored scales and a spiky frilled head |
| Siren | a red-haired woman with huge brown bird wings and bird legs with talons, her long hair covering her chest |
| Lamia | a dark-haired woman with a green crown and a teal armored top, her lower body fading into glowing green mist |
| Valkyrie | an armored warrior woman in olive-green scale armor and a winged helmet, with a red cape |
| Selkie | a red-haired woman in a grey cloak sitting on a grey sealskin with a seal tail |
| Mami Wata | a dark-skinned water spirit with a beaded headdress and beaded necklaces, holding a hand mirror, with a green fish tail |
| Apsara | a dancing celestial woman in a flowing red-orange outfit with a tall golden crown and gold bracelets |
| Iara | a woman with long green hair and a gold top, with a long green fish tail, sitting on a mossy rock |
| Kitsune | a red-orange fox with nine flame-like tails with white tips |
| Sylph | a dark, wispy, translucent air spirit made of swirling smoke |
| Qilin | a qilin: a deer-like body covered in pale blue-gold scales, a dragon head with antlers and a golden mane |
| Banshee | a pale ghostly woman with long dark hair, fading into shadow |
| Fenghuang | a fenghuang: a pheasant-like bird with green, red and blue plumage and a long flowing tail |
| Griffin | a griffin lying down, with a golden eagle head and large brown wings on a lion body |
| Deer Woman | a woman with long auburn hair, deer ears and large antlers, in a green dress with feathers in her hair |
| Naga | a crowned four-armed deity seated on a coiled blue-and-white serpent, shaded by a hood of many cobra heads |
| Xana | a woman with long golden hair in a flowing light-blue dress, floating, holding a small harp |
| Rusalka | a pale woman with long dark wet hair in a ragged grey-green gown |
| Djinn | a blue-skinned man with a dark beard, holding a staff topped with a teal crystal, his lower body turning into smoke |
| Deva | a four-armed golden-skinned deity with a tall ornate golden crown, a blue sash and gold armbands |
| Swan Maiden | a woman with long brown hair in a gown of white swan feathers, with white swan wings |
