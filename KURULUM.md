# TUTANAK TAKİP SİSTEMİ — KURULUM REHBERİ

## 📁 Dosya Yapısı

```
tutanak-takip/
├── app/
│   ├── page.js          ← Ana uygulama
│   └── layout.js        ← Sayfa düzeni
├── package.json         ← Bağımlılıklar
├── .env.local           ← Supabase bilgileri (kendiniz oluşturun)
└── schema.sql           ← Veritabanı şeması + veriler
```

---

## 🚀 KURULUM ADIMLARI

### ADIM 1: Supabase Projesi Oluştur

1. https://supabase.com adresine gidin
2. "New Project" → İsim: `tutanak-takip`
3. Proje oluşturulduktan sonra:
   - **Settings** → **API** bölümüne gidin
   - **Project URL** ve **anon public** key'i kopyalayın

### ADIM 2: Veritabanını Kur

1. Supabase Dashboard → **SQL Editor**
2. `schema.sql` dosyasının tüm içeriğini yapıştırın
3. **Run** butonuna basın
4. Tablolar ve veriler otomatik oluşacak

### ADIM 3: Next.js Projesini Kur

```bash
# Proje klasörünü oluştur
mkdir tutanak-takip
cd tutanak-takip

# Dosyaları kopyala (app/, package.json)

# .env.local dosyası oluştur
cp .env.local.example .env.local

# .env.local içine Supabase bilgilerini yaz
nano .env.local
```

`.env.local` içeriği:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### ADIM 4: Bağımlılıkları Yükle ve Çalıştır

```bash
npm install
npm run dev
```

Tarayıcıda: http://localhost:3000

### ADIM 5: Vercel'e Deploy

```bash
# Git repo oluştur
git init
git add .
git commit -m "ilk commit"

# GitHub'a yükle, sonra:
# 1. vercel.com'a git
# 2. "Import Project" → GitHub reposunu seç
# 3. Environment Variables ekle:
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY
# 4. Deploy!
```

---

## 👤 KULLANICI YÖNETİMİ

### Varsayılan Admin
- **Kullanıcı adı:** admin
- **Şifre:** admin123

### Yeni Üye Eklemek (SQL ile)
```sql
INSERT INTO kullanicilar (username, password, display_name, rol, isim_soyisim)
VALUES ('tarkan', 'sifre123', 'Tarkan Apari', 'uye', 'TARKAN APARİ');
```

### Yeni Üye Eklemek (Admin Panelinden)
1. Admin olarak giriş yap
2. "👥 Kullanıcılar" butonuna tıkla
3. Formu doldur ve "Kullanıcı Ekle"

---

## 📊 KATEGORİLER

| Kategori | İkon | Kişi Sayısı |
|----------|------|-------------|
| İlçe Yönetimi | 🏛️ | 44 kişi |
| Mahalle Başkanları | 🏘️ | 12 kişi |
| Üye Dostları | 💪 | 1 kişi |
| Belediye Meclis Üyeleri | 🏢 | 24 kişi |

---

## ⚙️ YENİ KİŞİ EKLEMEK

Supabase SQL Editor'de:

```sql
-- İlçe Yönetimine ekle
INSERT INTO kisiler (isim_soyisim, kategori) 
VALUES ('YENİ KİŞİ ADI', 'ilce_yonetimi');

-- Mahalle Başkanı ekle
INSERT INTO kisiler (isim_soyisim, kategori, mahalle, telefon) 
VALUES ('YENİ BAŞKAN', 'mahalle', 'MAHALLE ADI', '(5XX) XXX-XXXX');

-- Üye Dostu ekle
INSERT INTO kisiler (isim_soyisim, kategori) 
VALUES ('YENİ GÖNÜLLÜ', 'uye_dostlari');

-- Meclis Üyesi ekle
INSERT INTO kisiler (isim_soyisim, kategori, gorev, telefon) 
VALUES ('YENİ MECLİS ÜYESİ', 'belediye_meclis', 'İLÇE', '(5XX) XXX-XXXX');
```

---

## 🔐 ROLLER

| Rol | Görebileceği | Yapabileceği |
|-----|-------------|--------------|
| **admin** | Tüm kayıtlar, tüm kategoriler | Ekleme, silme, Excel export, kullanıcı yönetimi |
| **uye** | Sadece kendi satırları | Sadece görüntüleme + Excel export |

---

## ⚠️ ÜYE UYARI SİSTEMİ

Admin "TC/Seri No Hatalı" girdiğinde, ilgili üye giriş yaptığında sarı uyarı kutusu görür:

> ⚠️ **5 adet** TC/Seri No hatalı formunuz geri iade edilmiştir. Lütfen ilçe binasından teslim alınız.
