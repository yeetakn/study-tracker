# Çalışma Defteri

Çalışma oturumlarını kaydetmeye, kişisel ders ve kategorileri düzenlemeye, çalışma geçmişini incelemeye ve PDF raporları oluşturmaya yönelik yerelde çalışan bir çalışma takip uygulaması.

**Dokümantasyon:** [English](README.md) | [Türkçe](README.tr.md)

## İçindekiler

- [Genel Bakış](#genel-bakış)
- [Özellikler](#özellikler)
- [Kullanılan Teknolojiler](#kullanılan-teknolojiler)
- [Sistem Gereksinimleri](#sistem-gereksinimleri)
- [Kurulum Rehberi](#kurulum-rehberi)
  - [1. Node.js ve npm Kurulumu](#1-nodejs-ve-npm-kurulumu)
  - [2. Proje Dosyalarını Edinme](#2-proje-dosyalarını-edinme)
  - [3. Proje Klasörünü Açma](#3-proje-klasörünü-açma)
  - [4. Bağımlılıkları Yükleme](#4-bağımlılıkları-yükleme)
  - [5. Uygulamayı Başlatma](#5-uygulamayı-başlatma)
- [Kullanılabilir Komutlar](#kullanılabilir-komutlar)
- [Veri Depolama ve Yedekleme](#veri-depolama-ve-yedekleme)
- [Sorun Giderme](#sorun-giderme)
- [Sınırlamalar](#sınırlamalar)

## Genel Bakış

Çalışma Defteri, öğrencilerin çalışma oturumlarını kaydetmelerini ve geçmiş çalışmalarını incelemelerini sağlar. Uygulama bir web tarayıcısında çalışır ve verileri IndexedDB aracılığıyla yerel olarak saklar.

Mevcut sürümde kullanıcı hesabı, uzak sunucu veya bulut hizmeti zorunlu değildir.

## Özellikler

- Çalışma özetlerini ve istatistikleri görüntüleme
- Çalışma kaydı oluşturma, düzenleme ve silme
- Takvim üzerinden çalışma geçmişini inceleme
- Kişisel kategoriler ve dersleri oluşturma, düzenleme ve gruplama
- Günlük, haftalık, iki haftalık, aylık ve özel tarih aralıklı raporlar
- PDF raporu dışa aktarma
- JSON formatında veri yedekleme ve geri yükleme
- Onay gerektiren yerel veri sıfırlama işlemi
- Türkçe ve İngilizce arayüz desteği
- Tarayıcı diline göre ilk dilin otomatik seçilmesi
- Dil tercihinin kalıcı olarak saklanması

## Kullanılan Teknolojiler

| Teknoloji | Kullanım amacı |
|---|---|
| React | Kullanıcı arayüzü |
| TypeScript | Statik tür denetimi |
| Vite | Geliştirme sunucusu ve üretim derlemesi |
| Tailwind CSS | Arayüz stilleri |
| IndexedDB | Tarayıcıda yerel veri depolama |
| `idb` | IndexedDB API'si için yardımcı kütüphane |
| `jsPDF` | PDF oluşturma |
| `jspdf-autotable` | PDF raporlarında tablo oluşturma |
| `date-fns` | Tarih işlemleri |
| `lucide-react` | Simge kütüphanesi |

## Sistem Gereksinimleri

Gerekli bileşenler:

- Windows, Linux veya macOS işletim sistemi
- Node.js; etkin bir LTS sürümü önerilir
- Node.js ile birlikte gelen npm
- Güncel bir web tarayıcısı
- Proje dosyalarını indirmek ve bağımlılıkları yüklemek için internet bağlantısı

Projeyi ZIP dosyası olarak indirirsen Git kurman gerekmez. Depoyu Git ile klonlamak istiyorsan Git gerekir.

> **Önemli:** Node.js, kurulum komutlarının ihtiyaç duyduğu geliştirme aracıdır. Bu, uygulamanın Windows'a özel olduğu anlamına gelmez. Mevcut proje tarayıcıda çalışır ve bağımsız bir masaüstü kurulum dosyası sunmaz.

## Kurulum Rehberi

### 1. Node.js ve npm Kurulumu

Node.js, geliştirme araçlarının kullandığı JavaScript çalışma ortamını sağlar. npm ise projenin bağımlılıklarını yükler.

1. Resmî Node.js sitesini aç: https://nodejs.org/
2. İşletim sistemine uygun, etkin bir LTS sürümünü indir.
3. İndirdiğin kurulum dosyasını çalıştır.
4. Kurulum adımlarını tamamla. Bir seçenek olarak sunuluyorsa npm bileşeninin kurulumda etkin olduğundan emin ol.
5. Kurulum bittikten sonra terminali kapatıp yeniden aç.

Kurulumu doğrulamak için:

```bash
node --version
npm --version
```

Her iki komut da bir sürüm numarası göstermelidir.

Komutlardan biri tanınmıyorsa terminali yeniden aç. Sorun devam ederse Node.js kurulumunu ve sistemin PATH değişkenini kontrol et.

### 2. Proje Dosyalarını Edinme

Aşağıdaki yöntemlerden birini kullan.

**Yöntem A — Kaynak kodunu ZIP olarak indirme**

1. Projenin GitHub deposunu tarayıcıda aç.
2. **Code** menüsünden **Download ZIP** seçeneğine tıkla.
3. İndirilen arşivi çıkart.
4. `package.json` ve `package-lock.json` dosyalarının bulunduğu proje klasörünü bul.

**Yöntem B — Git ile klonlama**

Git kurulu değilse https://git-scm.com/ adresinden indirip kur.

Ardından aşağıdaki komutu çalıştır. `<REPOSITORY_URL>` bölümünü gerçek GitHub depo adresiyle değiştir:

```bash
git clone https://github.com/yeetakn/study-tracker.git
```

Git'in oluşturduğu proje klasörüne gir.

### 3. Proje Klasörünü Açma

Terminali projenin kök klasöründe aç.

Alternatif olarak proje klasörünü Visual Studio Code ile açıp **Terminal → New Terminal** seçeneğini kullanabilirsin.

Aşağıdaki dosyaların bulunduğunu kontrol et:

```text
package.json
package-lock.json
README.md
README.tr.md
src/
public/
```

Proje geliştikçe klasör yapısı değişebilir. Ancak bağımlılıkları yüklemeden önce kök dizinde `package.json` bulunmalıdır.

**Projenin kök dizini**, `package.json` dosyasının bulunduğu klasördür. Bu rehberdeki bütün komutları bu dizinde çalıştırmalısın.

### 4. Bağımlılıkları Yükleme

Proje dizininde şu komutu çalıştır:

```bash
npm ci
```

`npm ci`, `package-lock.json` dosyasında belirtilen bağımlılık sürümlerini yükler. Tekrarlanabilir ve temiz bir kurulum için önerilen yöntemdir.

Kilit dosyası yoksa veya bilinçli olarak yeniden oluşturulması gerekiyorsa şu komutu kullanabilirsin:

```bash
npm install
```

npm işlemi tamamlanana kadar bekle. Kurulum başarısız olursa devam etmeden önce terminal çıktısını incele.

`package-lock.json` dosyasını rutin bir sorun giderme adımı olarak silme. Bu dosya, bağımlılık sürümlerinin tutarlı kalmasına yardımcı olur.

#### Windows PowerShell

PowerShell, mevcut çalıştırma politikası nedeniyle `npm.ps1` dosyasını engelliyorsa Windows komut aracısını kullan:

```powershell
npm.cmd ci
```

Gerekirse `npm install` yerine `npm.cmd install` komutunu da kullanabilirsin.

Bu yöntem için sistemin çalıştırma politikasını değiştirmen gerekmez.

### 5. Uygulamayı Başlatma

Vite geliştirme sunucusunu başlat:

```bash
npm run dev
```

Windows PowerShell ortamında gerekirse:

```powershell
npm.cmd run dev
```

Terminalde Vite tarafından gösterilen yerel adresi bekle ve bu adresi tarayıcıda aç. Varsayılan adres genellikle şöyledir:

http://localhost:5173/

Geliştirme sunucusunu kullanırken terminal açık kalmalıdır. Terminal kapatılırsa sunucu durur.

Sunucuyu elle durdurmak için terminali etkinleştirip `Ctrl+C` tuşlarına bas.

## Kullanılabilir Komutlar

Aşağıdaki komutları proje kök dizininde çalıştır.

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusunu başlatır |
| `npm run build` | TypeScript proje kontrollerini çalıştırır ve üretim derlemesini oluşturur |
| `npm run lint` | ESLint denetimini çalıştırır |
| `npm run preview` | Üretim derlemesini yerel ortamda önizler |

Windows PowerShell alternatifleri:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd run preview
```

### Projeyi Doğrulama

Değişiklik göndermeden veya yeni bir sürüm yayımlamadan önce şu kontrolleri çalıştır:

```bash
npm run lint
npm run build
```

Her iki komut da hata vermeden tamamlanmalıdır. Vite derleme sırasında paket boyutuyla ilgili bir uyarı gösterebilir; bu uyarı tek başına derlemenin başarısız olduğu anlamına gelmez.

### Üretim Derlemesi

Üretim dosyalarını oluşturmak için:

```bash
npm run build
```

Çıktı dosyaları `dist/` dizinine yazılır.

Bu dosyaları yerel ortamda önizlemek için:

```bash
npm run preview
```

Önizleme sunucusu yerel doğrulama içindir. Tek başına bir barındırma hizmeti veya masaüstü kurulum paketi değildir.

## Veri Depolama ve Yedekleme

Çalışma kayıtları ve ders bilgileri tarayıcının IndexedDB veritabanında saklanır.

- Veriler, uygulamanın açıldığı tarayıcıda yerel olarak tutulur.
- Mevcut sürümde cihazlar veya tarayıcılar arasında otomatik senkronizasyon yoktur.
- Tarayıcının site verilerinin silinmesi, kayıtların kalıcı olarak kaybolmasına neden olabilir.
- Verileri taşımak için JSON yedekleme ve geri yükleme özellikleri kullanılabilir.
- Verileri sıfırlamadan, tarayıcı değiştirmeden veya başka bir cihaza geçmeden önce yedek al.

Yedek geri yüklendikten sonra beklenen kayıtların ve derslerin mevcut olduğunu kontrol et.

**Veri sıfırlama işlemi geri alınamaz sonuçlar doğurabilir.** Yalnızca yerel uygulama verilerini silmek istediğinde kullan. Kayıtların önemliyse önce yedek al.

## Sorun Giderme

### `node` veya `npm` komutu tanınmıyor

- Node.js'in kurulu olduğunu doğrula.
- Terminali kapatıp yeniden aç.
- `node --version` ve `npm --version` komutlarını yeniden çalıştır.
- Sorun devam ediyorsa sistemin PATH değişkenini kontrol et.

### PowerShell, `npm.ps1` dosyasının çalışmasını engelliyor

`npm` yerine `npm.cmd` kullan:

```powershell
npm.cmd ci
npm.cmd run dev
```

### Bağımlılık kurulumu başarısız oluyor

- İnternet bağlantısını kontrol et.
- Terminalin proje kök dizininde olduğundan emin ol.
- npm çıktısındaki ilk anlamlı hata mesajını incele.
- Node.js sürümünün projeyle uyumlu olduğunu doğrula.
- Temel sorunu çözdükten sonra `npm ci` komutunu yeniden çalıştır.

### Yerel adres açılmıyor

- Vite'ın terminalde hâlâ çalıştığını kontrol et.
- Vite tarafından gösterilen tam adresi kullan.
- Aynı portu kullanan başka bir uygulama olup olmadığını kontrol et.
- Geliştirme sunucusunun hata mesajlarını incele.

### Değişiklikler tarayıcıda görünmüyor

- Geliştirme sunucusunun çalıştığını doğrula.
- Tarayıcı konsolunda çalışma zamanı hatalarını kontrol et.
- Gerekirse sayfayı yenile.

### Derleme sırasında büyük paket uyarısı çıkıyor

Vite, oluşturulan JavaScript paketlerinden biri belirlenen boyut sınırını aştığında uyarı gösterebilir. Bu uyarı derlemenin otomatik olarak başarısız olduğu anlamına gelmez. Derleme çıktısını incele; başlangıç performansının iyileştirilmesi gerekiyorsa kod bölme yöntemlerini değerlendir.

### Yerel veriler görünmüyor

- Aynı tarayıcıyı ve tarayıcı profilini kullandığını doğrula.
- Tarayıcı site verilerinin silinip silinmediğini kontrol et.
- Daha önce dışa aktardığın bir JSON yedeği varsa verileri geri yükle.

## Sınırlamalar

- Mevcut uygulama bir tarayıcı uygulamasıdır.
- Veriler tarayıcının yerel depolama alanında saklanır.
- Cihazlar arası senkronizasyon yok.

Geliştirme ortamını kurmak için bu rehberdeki Node.js ve bağımlılık kurulum adımlarını uygula.