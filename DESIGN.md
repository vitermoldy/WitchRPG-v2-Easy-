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
| Penanda musuh | Mata musuh tetap menyala amber `#ffa53d` (kecuali Hellhound yang matanya cyan seperti referensinya). Pegasus dan Unicorn bermata biru lembut | Penanda v1 supaya musuh tidak terbaca sebagai merah Chaos atau ungu Umbra, dan supaya satwa yang tidak bermusuhan bisa dibedakan. Mudah dihapus kalau pemilik tidak mau. |
| Atribut khas | Minotaur dua kapak bermata ganda, rok kulit berpaku, cincin hidung, kaki berkuku; Cyclops satu mata besar, tali silang di dada, sabuk tengkorak, perisai bundar; Centaur busur terentang, gelang emas, wadah panah; Harpy sayap-lengan biru putih dan kaki burung; Succubus dan Incubus zirah gelap dengan permata hijau; Samael sayap putih keemasan, jubah merah, pedang melengkung bercahaya; Lilith gaun ungu dengan naga ular merah melilit | Diambil dari gambar referensi. Bentuknya tetap dibangun sendiri dari bentuk dasar, tidak dijiplak. |
| Peran Cyclops | Gambar referensi membawa perisai bundar, bukan batu. Perannya tetap pelempar batu (Bombard); batu diambil dari tanah saat menyerang | Rupa mengikuti referensi, peran mengikuti roster. |
| Bayangan | Model makhluk yang sama dengan badan ungu kehitaman, retakan ungu `#8f55ff`, mata ungu terang | Prompt meminta bayangan memakai model makhluk asal. Render 06. |
| Telegraf amber | Cincin yang bisa ditahan atau di-parry: cincin dalam terang plus cincin luar redup penanda area | Render 04. Garis tebal berkedip untuk serangan yang harus di-dodge belum dibuat di previz. |
| Altar | Cahaya teal `#9ff2e0` | Bukan merah Chaos, ungu Umbra, atau amber musuh. |
| Tongkat | Dipegang tangan kanan (tangan Umbra), sigil merah Chaos di kepala tongkat | Tangan kiri tetap bebas untuk Hex Bolt dan Telekinesis saat membidik. |
| Model block-out | Dibangun dari bagian bernama yang punya pivot sendiri (pelvis, torso, kepala, lengan atas, lengan bawah, tangan, paha, betis, leher Hydra per ruas) | Bisa dianimasikan prosedural seperti `models.ts` v1 kalau rig per tulang terlalu mahal. Animatic sudah memakai cara ini untuk langkah Ilyra dan leher Hydra. |
| Anggaran mini-boss | Medusa dan Chimera memakai anggaran boss (30.000), bukan mob (8.000) | Medusa block-out sudah 15.928 segitiga karena tiga belas kepala ular di rambutnya. |
| Pantulan air | Danau dan rawa memakai probe pantulan planar, bukan pantulan raytracing layar saja | Pantulan layar EEVEE patah menjadi tepi diagonal tajam saat sinarnya keluar layar (terlihat di animatic versi pertama). Probe planar memantulkan tepi seberang dengan benar dan membuat Danau Hitam benar-benar hitam. Di Three.js padanannya `Reflector` planar di permukaan danau. |
| Uji Lembah Bara | Render tambahan `07-uji-lembah-bara.png`. Kabut oranye zona V tetap dipakai | Mengecek apakah makhluk zona V (Phoenix merah-oranye, Cerberus ungu keabuan) dan tangan merah Chaos tetap terbaca di kabut oranye. Hasilnya di PREVIZ.md. |
| Gambar referensi | Hanya muncul di `previz/papan-makhluk.png` sebagai pembanding. Tidak ada model yang memakai gambar itu sebagai tekstur, dan tidak ada yang masuk `public/` atau `dist/` | Aturan prompt. |

## Fase 1: fondasi (24 Nov 2026)

| Bagian | Keputusan | Alasan |
