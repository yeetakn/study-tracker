# Çalışma Defteri

YKS hazırlık sürecini takip etmek için geliştirilmiş, ders ve konu bazlı çalışma kayıtları oluşturmaya, çalışma geçmişini incelemeye ve rapor hazırlamaya yönelik bir web uygulaması.

**Diller:** [English](README.md) | [Türkçe](README.tr.md)

## Özellikler

- **Genel Bakış:** Çalışma etkinliklerini ve özet istatistikleri görüntüleme.
- **Çalışma Kayıtları:** Çalışma oturumları oluşturma, düzenleme ve silme.
- **Takvim:** Çalışma geçmişini tarihe göre görüntüleme.
- **Ders Yönetimi:** Ders ekleme, yeniden adlandırma ve silme.
- **Raporlar:** Günlük, haftalık, iki haftalık, aylık ve özel tarih aralığına göre rapor oluşturma.
- **PDF Dışa Aktarma:** Çalışma raporlarını PDF biçiminde dışa aktarma.
- **Veri Yedekleme:** Uygulama verilerini JSON dosyasına aktarma.
- **Veri Geri Yükleme:** JSON yedeğindeki verileri içe aktarma.
- **Verileri Sıfırlama:** Açık bir onay sürecinden sonra yerel uygulama verilerini sıfırlama.

## Kullanılan Teknolojiler

- **React** — kullanıcı arayüzü
- **TypeScript** — statik tür denetimi
- **Vite** — geliştirme sunucusu ve derleme araçları
- **Tailwind CSS** — arayüz stilleri
- **IndexedDB** — tarayıcı tarafında veri depolama
- **idb** — IndexedDB API'si için yardımcı kütüphane
- **jsPDF** ve **jspdf-autotable** — PDF oluşturma
- **date-fns** — tarih işlemleri
- **lucide-react** — simgeler

## Gereksinimler

- Node.js (LTS sürümü önerilir)
- npm

Projeyi Git üzerinden indirmeyi planlıyorsan Git de gereklidir; aksi hâlde zorunlu değildir.

Geliştirme ortamı olarak Windows, Linux veya macOS kullanılabilir.

## Kurulum

### 1. Proje dizinini aç

Projenin kök dizininde bir terminal aç.

### 2. Bağımlılıkları yükle

```bash
npm install
```

### 3. Geliştirme sunucusunu başlat

```bash
npm run dev
```

Terminalde görüntülenen yerel adresi tarayıcıda aç. Vite varsayılan olarak genellikle `http://localhost:5173` adresini kullanır.

### Windows PowerShell

PowerShell, geçerli çalıştırma politikası nedeniyle `npm.ps1` dosyasının çalışmasını engelliyorsa `npm.cmd` kullanabilirsin:

```powershell
npm.cmd install
npm.cmd run dev
```

Bu, PowerShell'e özgü bir çözümdür; uygulamanın Windows'a bağımlı olduğu anlamına gelmez.

## Derleme ve Önizleme

Üretim derlemesi oluşturmak için:

```bash
npm run build
```

Üretim derlemesini yerel ortamda önizlemek için:

```bash
npm run preview
```

Komutları projenin kök dizininde çalıştır.

## Veri Depolama

Çalışma kayıtları ve ders bilgileri, tarayıcının IndexedDB depolama alanında yerel olarak saklanır.

- Yerel kullanım için hesap veya uzak sunucu gerekmez.
- Veriler cihazlar veya tarayıcılar arasında otomatik olarak eşitlenmez.
- Tarayıcının site verilerinin silinmesi, kayıtların kalıcı olarak kaybolmasına neden olabilir.
- Verileri farklı ortamlara taşımak için JSON yedekleme ve geri yükleme özellikleri kullanılabilir.
- Verileri sıfırlamadan veya cihaz değiştirmeden önce düzenli yedek alınması önerilir.

Yedek geri yüklendikten sonra beklenen kayıtların ve derslerin mevcut olduğunu kontrol et.

## Proje Yapısı

```text
study-tracker/
├── public/
│   └── fonts/          # PDF çıktılarında kullanılan yazı tipleri
├── src/
│   ├── components/     # Ortak arayüz bileşenleri
│   ├── db/             # Veritabanı işlemleri
│   ├── pages/          # Uygulama sayfaları
│   ├── services/       # Yedekleme ve yardımcı servisler
│   ├── types/          # TypeScript tür tanımları
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── README.tr.md
```

## Kapsam ve Sınırlamalar

Çalışma Defteri, tarayıcı depolamasını kullanan istemci taraflı bir uygulamadır. Mevcut sürümde kullanıcı hesapları, bulut senkronizasyonu veya uzak veritabanı bulunmaz.

Her tarayıcı kendi yerel veri alanını kullanır. Verileri başka bir tarayıcıya veya cihaza taşımak için JSON yedeğini dışa aktar ve hedef ortamda geri yükle.

## Geliştirme

Geliştirme sunucusunu başlatmadan veya üretim derlemesi oluşturmadan önce bağımlılıkları yükle.

Önemli değişikliklerden sonra uygulamanın başarıyla derlendiğini doğrulamak için üretim derlemesini çalıştır.

Yeni paketler eklerken veya kaldırırken bağımlılık tanımlayıcısını (`package.json`) ve kilit dosyasını (`package-lock.json`) uyumlu tut.