# ♾️ Infinite Knob Widget

**Pure Canvas** — inspired by [jqxKnob Infinite Knob](https://www.jqwidgets.com/jquery-widgets-demo/demos/jqxknob/infinite-knob.htm)

Widget knob interaktif berbasis **Canvas API murni** (tanpa library eksternal). Bisa di-drag dengan mouse atau sentuhan jari, mendukung **infinite scroll** saat nilai melewati batas minimum/maksimum.

## ✨ Fitur

| Fitur | Deskripsi |
|-------|-----------|
| 🎨 **Dial Gradient** | Lingkaran dengan gradien putih/abu-abu seperti knob asli |
| 🟢 **Progress Bar** | Busur hijau (#00a644) untuk progress, oranye (#ff8b1e) untuk background |
| 🔵 **Spinner Ring** | Lingkaran biru (#00a4e1) dengan 10 marks putih |
| 📏 **Marks & Labels** | Major ticks (setiap 10) dan minor ticks (setiap 2) + angka di keliling |
| 🔘 **Circle Pointer** | Pointer oranye (#ef6100) yang bisa di-drag |
| ♾️ **Infinite Scroll** | Putar melewati batas 0 atau 100 → range bergeser otomatis |
| 🖱️ **Drag & Touch** | Dukung mouse drag dan touch events untuk mobile |
| 📱 **Responsive** | Ukuran otomatis mengikuti lebar layar (HP, tablet, PC) |
| 🚀 **Zero Dependency** | Murni Vanilla JavaScript + Canvas API, tanpa library |

## 📂 Struktur Project

```
knob_js/
├── asset/
│   ├── knob/
│   │   ├── knob.js        # Class KnobInfinite (inti widget)
│   │   └── knob.css        # Styling wrapper & value display
│   └── web/
│       ├── main.css        # Styling halaman demo (responsive)
│       └── main.js         # Logika demo & kontrol
└── index.html              # Halaman utama
```

## 🚀 Cara Penggunaan

### 1. Include file ke HTML

```html
<!-- CSS -->
<link rel="stylesheet" href="path/to/knob.css">

<!-- HTML Container -->
<div id="my-knob"></div>

<!-- JS -->
<script src="path/to/knob.js"></script>
```

### 2. Inisialisasi Widget

```javascript
const knob = new KnobInfinite('my-knob', {
    value: 60,          // Nilai awal
    min: 0,             // Nilai minimum
    max: 100,           // Nilai maksimum
    step: 1,            // Step perubahan
    startAngle: 150,    // Sudut mulai (derajat, 0=atas)
    endAngle: 510,      // Sudut akhir (derajat, 0=atas)
    rotation: 'clockwise',
    snapToStep: true,
    infinite: true,     // Aktifkan infinite scroll
    infiniteStep: 100,  // Step pergeseran range
    units: '',          // Satuan (contoh: 'rpm', '°C')
    animationDuration: 300
});
```

### 3. Method Publik

| Method | Deskripsi |
|--------|-----------|
| `setValue(value, silent?)` | Set nilai knob |
| `getValue()` | Dapatkan nilai saat ini |
| `getRange()` | Dapatkan range `{min, max}` (berguna saat infinite) |
| `on(event, callback)` | Daftarkan event listener |
| `off(event, callback?)` | Hapus event listener |
| `draw()` | Render ulang |
| `destroy()` | Hancurkan instance |

### 4. Events

```javascript
// Event saat nilai berubah
knob.on('change', (data) => {
    console.log('Nilai:', data.value, '| Nilai lama:', data.oldValue);
});

// Event saat infinite scroll terjadi
knob.on('infinity', (data) => {
    console.log('Arah:', data.direction); // 'up' atau 'down'
    console.log('Range baru:', data.min, '-', data.max);
});
```

## ⚙️ Opsi Konfigurasi Lengkap

| Opsi | Tipe | Default | Deskripsi |
|------|------|---------|-----------|
| `value` | number | `60` | Nilai awal |
| `min` | number | `0` | Nilai minimum awal |
| `max` | number | `100` | Nilai maksimum awal |
| `step` | number | `1` | Step perubahan nilai |
| `startAngle` | number | `150` | Sudut mulai (derajat, 0=posisi jam 12) |
| `endAngle` | number | `510` | Sudut akhir (startAngle + 360 = lingkaran penuh) |
| `rotation` | string | `'clockwise'` | Arah rotasi |
| `snapToStep` | boolean | `true` | Snap nilai ke step terdekat |
| `infinite` | boolean | `true` | Aktifkan mode infinite scroll |
| `infiniteStep` | number | `100` | Besar pergeseran range saat infinite |
| `units` | string | `''` | Satuan nilai (ditampilkan di bawah angka) |
| `animationDuration` | number | `300` | Durasi animasi (ms) |

## 🎯 Demo Langsung

Buka `index.html` di browser untuk melihat demo interaktif.

## 🛠️ Teknologi

- **Canvas API** — Untuk rendering semua elemen visual
- **Vanilla JavaScript (ES6 Class)** — Tanpa framework/library
- **CSS3** — Untuk styling halaman dan responsive layout
- **ResizeObserver** — Untuk deteksi perubahan ukuran container

## 📱 Responsive Breakpoints

| Perangkat | Lebar | Ukuran Knob |
|-----------|-------|-------------|
| HP | < 480px | 100% container |
| Tablet | 481 - 1024px | Maks 350px |
| Desktop | > 1024px | Maks 420px |

## 📄 Lisensi

MIT — Bebas digunakan untuk proyek pribadi maupun komersial.
