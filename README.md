# Jastip Kece

Aplikasi React untuk mencatat trip, pelanggan, pesanan, status pembelian, dan margin jastip. Konversi JPY ke IDR menggunakan kurs tetap yang ditentukan di `src/App.jsx`.

## Menjalankan secara lokal

Persyaratan: Node.js 20.19+ atau 22.12+.

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan oleh Vite, biasanya <http://localhost:5173>.

## Perintah

```bash
npm run dev      # server pengembangan
npm run build    # build produksi ke folder dist
npm run preview  # melihat build produksi
npm run lint     # pemeriksaan kode
```

Data trip, pelanggan, dan pesanan tersimpan di `localStorage` browser yang digunakan.

## Catatan fitur scan

Tombol scan struk berasal dari prototipe awal dan memanggil API eksternal langsung dari browser. Fitur ini memerlukan integrasi backend yang aman sebelum dapat digunakan di produksi. Fitur pencatatan lainnya dapat digunakan secara lokal tanpa backend.
