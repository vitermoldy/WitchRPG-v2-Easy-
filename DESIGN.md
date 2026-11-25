# DESIGN.md: WitchRPG v2 (Crimson Sovereign: Hutan)

Action-RPG third-person dengan rasa God of War di hutan terbuka, memakai sistem gameplay WitchRPG v1 (sihir Chaos, pasukan bayangan Umbra, Ledger, level, stat, skill). Dokumen ini mencatat keputusan pemilik dan keputusan kecil yang saya ambil di tiap fase. Spesifikasi lengkap ada di [PROMPT.md](./PROMPT.md); angka previz ada di [previz/PREVIZ.md](./previz/PREVIZ.md).

## Keputusan pemilik (24 Nov 2026)

| Pertanyaan | Jawaban |
| --- | --- |
| Sistem gameplay | Mengikuti v1: dua tangan sihir, Chaos, Umbra, Ledger, level, stat, skill, pasukan bayangan |
| Rasa permainan | God of War: kamera third-person di balik bahu, satu kamera tanpa pemotongan, tempur berbobot, boss sebagai set-piece |
| Dunia | Hutan terbuka |
| Makhluk dan musuh | Mengacu pada gambar di `assets/` |
| Urutan kerja | Gambaran game dibuat dulu di Blender sebelum game dibuat |
| Rupa makhluk (setelah melihat previz pertama) | "Bentuk dan rupa musuh, boss, dan monsternya mirip seperti yang aku kirim." Warna, anatomi, proporsi, dan atribut khas tiap makhluk mengikuti gambar referensi; aturan prompt "badan gelap dengan mata dan retakan amber untuk semua musuh" tidak dipakai lagi |

## Fase 0: previz di Blender (24 Nov 2026)

| Bagian | Keputusan | Alasan |
| --- | --- | --- |
| Mesin render | EEVEE (`BLENDER_EEVEE`) di Blender 5.1.2 pada RTX 5070 Ti. Cycles tidak dipakai | Mesin yang tersedia di instalasi ini: `BLENDER_EEVEE`, `BLENDER_WORKBENCH`, `CYCLES`. EEVEE berjalan di GPU NVIDIA lewat OpenGL dalam mode tanpa antarmuka, merender still 1920 × 1080 dalam beberapa detik dan satu frame animatic di bawah satu detik, dengan kabut bervolume dan bloom. Cadangan Cycles tidak dibutuhkan. |
| Arti "FOV" | Selalu FOV vertikal, sama dengan `PerspectiveCamera.fov` di Three.js | Angka prompt tidak menyebut sumbu. Previz merender keduanya: FOV 68 vertikal dan 68 horizontal (vertikal 41,6). Keduanya ada di `previz/renders/00-kamera-varian.png`. |
