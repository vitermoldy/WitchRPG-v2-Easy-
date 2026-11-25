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
| Kamera normal | Jarak 3,4 m, bahu kanan 0,8 m, tinggi pivot 1,6 m di atas kaki, FOV vertikal 50° (horizontal 79° di 16:9), pitch awal -6° | Pada FOV 68 Ilyra hanya sepertiga tinggi layar dan tepi gambar meregang; pada 41,6 kawanan Imp sudah memenuhi seluruh lebar layar, jadi makhluk dari samping tidak terlihat. 50° menjaga Ilyra di sepertiga kiri dan masih memperlihatkan kawanan di depannya. |
| Mode bidik | Jarak 2,0 m, bahu 0,65 m, tinggi 1,6 m, FOV vertikal 40° | Prompt memakai 68 ke 54 (dikali 0,79). Dengan FOV normal 50, perbandingan yang sama memberi 40. Membidik harus mempersempit pandangan, bukan melebarkannya. |
| Lock-on | Kamera berputar (yaw dan pitch, tanpa roll) supaya titik dada target duduk di titik sepertiga kanan atas: 2/3 lebar layar, 1/3 tinggi dari atas. Untuk target besar kamera mundur sampai 1,6 m dan FOV naik sampai 6° | Dipakai di render 04 dan di animatic (Naga lalu Hydra). Target setinggi 14 m tidak muat di sepertiga atas tanpa mundur. |
| Satu kamera | Animatic adalah satu gerakan kamera tanpa potongan, dari udara turun ke bahu Ilyra | Keputusan pemilik nomor 2. |
| Tata letak peta | Medan 1.300 × 1.300 m; area main 1.000 × 1.000 m di dalam cincin gunung. Hutan Pembuka di selatan, Tebing Berangin dataran tinggi di timur, Rawa Berkabut di barat dengan Danau Hitam di ujung barat laut, Reruntuhan Kuil di utara, Lembah Bara di timur laut. Koordinat di PREVIZ.md | Jalan setapak dari altar awal di selatan bercabang ke tiap zona, jadi urutan Tier I ke V terbaca sebagai perjalanan ke utara. Gunung menutup tepi peta tanpa dinding. |
| Kabut per zona | Volume silinder per zona dengan kepadatan menipis ke atas dan ke tepi, plus sedikit emisi berwarna kabut. Danau Hitam punya kabut rendah sendiri | Warna zona harus terbaca dari udara (render 02) dan dari tanah. Di Three.js nanti diterjemahkan menjadi warna dan kepadatan kabut yang dicampur menurut posisi pemain. |
| Naga rawa dan Dragon | Gambar berlabel "Naga" di lembar referensi adalah naga bersayap gaya Barat; yang berlabel "Dragon" adalah naga ular gaya Timur. Naga rawa memakai siluet ular (tanpa sayap, jengger, sungut); Dragon memakai siluet bersayap | Naga rawa menyembur dari air dan menyelam, jadi tubuh ular lebih masuk akal. Dragon adalah set-piece Tier V yang butuh sayap besar. |
| Kepala Hydra | Lima kepala, kepala tengah paling besar | Lima kepala di gambar referensi. Fase 1 membuat kepala bisa limbung dan di-Eksekusi, jadi jumlahnya harus bisa dihitung pemain. Muat di anggaran boss (15.482 segitiga block-out). |
| Warna makhluk | Tiap makhluk punya palet sendiri dari gambar referensinya, dua nada (punggung dan perut). Contoh: Centaur badan kuda cokelat tua dengan ekor pucat dan manusia tua berambut putih; Medusa kulit hijau, rambut ular tembaga, gaun putih; Cerberus besar ungu keabuan dengan kalung hitam berduri; Hellhound hitam dengan urat cyan menyala; Atlas memikul bola dunia biru-hijau. Daftar lengkap di `COLORS` dalam `previz/blender/pv_creatures.py` | Keputusan pemilik setelah previz pertama. Versi pertama memakai satu gaya gelap untuk semua musuh dan pemilik menilai warnanya hampir sama dan bentuknya tidak mirip referensi. |
