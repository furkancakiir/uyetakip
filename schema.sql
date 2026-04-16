-- ============================================================
-- TUTANAK TAKİP SİSTEMİ — SUPABASE SQL ŞEMASI
-- Yeni Supabase projesinde bu dosyayı çalıştırın
-- ============================================================

-- 1. KULLANICILAR TABLOSU
CREATE TABLE kullanicilar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'uye')),
    isim_soyisim TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TUTANAK KAYITLARI TABLOSU
CREATE TABLE tutanak_kayitlari (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tutanak_tarih DATE NOT NULL,
    tutanak_no TEXT,
    isim_soyisim TEXT NOT NULL,
    teslim_edilen INTEGER DEFAULT 0,
    toplam_yapilabilir INTEGER DEFAULT 0,
    yeni_uye INTEGER DEFAULT 0,
    silinmis_uye INTEGER DEFAULT 0,
    secmen_olmayan INTEGER DEFAULT 0,
    il_ilce_disi INTEGER DEFAULT 0,
    mukerrer INTEGER DEFAULT 0,
    baska_parti_uyesi INTEGER DEFAULT 0,
    tc_seri_no_hatali INTEGER DEFAULT 0,
    imzasiz INTEGER DEFAULT 0,
    notlar TEXT,
    olusturulma_tarihi TIMESTAMPTZ DEFAULT now(),
    olusturan TEXT
);

-- 3. KİŞİLER TABLOSU (Kategorili)
CREATE TABLE kisiler (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    isim_soyisim TEXT UNIQUE NOT NULL,
    kategori TEXT NOT NULL CHECK (kategori IN ('ilce_yonetimi', 'mahalle', 'uye_dostlari', 'belediye_meclis')),
    telefon TEXT,
    mahalle TEXT,
    gorev TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Kapat
ALTER TABLE kullanicilar DISABLE ROW LEVEL SECURITY;
ALTER TABLE tutanak_kayitlari DISABLE ROW LEVEL SECURITY;
ALTER TABLE kisiler DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- VARSAYILAN ADMİN KULLANICISI
-- ============================================================
INSERT INTO kullanicilar (username, password, display_name, rol)
VALUES ('admin', 'admin123', 'İlçe Çalışanı', 'admin');

-- ============================================================
-- İLÇE YÖNETİMİ (44 kişi)
-- Not: EVREN ÖZKAN, ERTAN AKBAL, MUSTAFA TEKDEN, CANAN ÖZBEK, 
-- NEBAHAT ERKESİM Belediye Meclis Üyesi olarak kayıtlı
-- ============================================================
INSERT INTO kisiler (isim_soyisim, kategori) VALUES
('ABDULLAH BEYREK', 'ilce_yonetimi'),
('ABDULLAH POLAT', 'ilce_yonetimi'),
('AHMET KOÇ', 'ilce_yonetimi'),
('AKİF BİLGİÇ', 'ilce_yonetimi'),
('ALAADDİN MOHSEN', 'ilce_yonetimi'),
('ALİ METİN', 'ilce_yonetimi'),
('ASİYE YALÇIN', 'ilce_yonetimi'),
('BERAT MARANGOZ', 'ilce_yonetimi'),
('BUSE GÜLSÜM CEBECİ', 'ilce_yonetimi'),
('CAFER YAZAR', 'ilce_yonetimi'),
('ENGİN ÖZCAN', 'ilce_yonetimi'),
('ENGİN ŞAHİN', 'ilce_yonetimi'),
('ENVER DELİ', 'ilce_yonetimi'),
('ESRA AĞILLI', 'ilce_yonetimi'),
('FATMA AYDIN', 'ilce_yonetimi'),
('FURKAN ÇAKIR', 'ilce_yonetimi'),
('FURKAN TAŞBAŞI', 'ilce_yonetimi'),
('HABİBE TUGAY', 'ilce_yonetimi'),
('HİKMET DURDU', 'ilce_yonetimi'),
('İRFAN IŞIKYILDIZ', 'ilce_yonetimi'),
('KAAN ULUTAŞ', 'ilce_yonetimi'),
('KADİR KURT', 'ilce_yonetimi'),
('LEVENT TAN', 'ilce_yonetimi'),
('MERVE BAYCAR', 'ilce_yonetimi'),
('MUHAMMED BEŞİNCİ', 'ilce_yonetimi'),
('MUHAMMED BURAK YILDIZ', 'ilce_yonetimi'),
('MURAT ERGÜL', 'ilce_yonetimi'),
('MUSTAFA ALKAN', 'ilce_yonetimi'),
('NAİL TİLBAÇ', 'ilce_yonetimi'),
('NURAY ÖZŞAFAK', 'ilce_yonetimi'),
('ÖMER FARUK TÜRK', 'ilce_yonetimi'),
('ÖMER FARUK USLU', 'ilce_yonetimi'),
('REYYAN SEVİNÇ', 'ilce_yonetimi'),
('SELAHATTİN PAKER', 'ilce_yonetimi'),
('SEMANUR BEKTAŞ', 'ilce_yonetimi'),
('SİNAN ÇELİKKOL', 'ilce_yonetimi'),
('TAHA FEHMİ GAYBERİ', 'ilce_yonetimi'),
('TAMER CESUR', 'ilce_yonetimi'),
('YAKUP KILINÇ', 'ilce_yonetimi'),
('YAŞAR AÇIKGÖZ', 'ilce_yonetimi'),
('YILMAZ İSTANBULLU', 'ilce_yonetimi'),
('YUNUS KARAASLAN', 'ilce_yonetimi'),
('YUSUF DEĞERLİ', 'ilce_yonetimi'),
('YUSUF ŞİN', 'ilce_yonetimi');

-- ============================================================
-- MAHALLE BAŞKANLARI (12 kişi)
-- ============================================================
INSERT INTO kisiler (isim_soyisim, kategori, mahalle, telefon) VALUES
('DERVİŞ YILDIRIM', 'mahalle', 'ALTINŞEHİR', '(532) 470-4134'),
('SERDAR KALBİŞEN', 'mahalle', 'BAHÇEŞEHİR 1', '(532) 564-3406'),
('MÜRSEL HÜSEYİN OKTAY', 'mahalle', 'BAHÇEŞEHİR 2', '(532) 485-5536'),
('SUAT EKİNCİ', 'mahalle', 'BAŞAK-1', '(535) 365-7676'),
('YUNUS OĞUZ', 'mahalle', 'BAŞAK-2', '(532) 688-9843'),
('ÖMER ÜNAL', 'mahalle', 'BAŞAKŞEHİR', '(536) 317-3948'),
('MEHMET FEHMİ AVŞAR', 'mahalle', 'FENERTEPE', '(554) 750-4222'),
('MEHMET BAYRAM', 'mahalle', 'GÜVERCİNTEPE', '(536) 309-6305'),
('AYDIN KISKAÇ', 'mahalle', 'KAYABAŞI', '(542) 767-4417'),
('MEHMET İNCEL', 'mahalle', 'ŞAHİNTEPE', '(533) 012-2924'),
('DURSUN ÖNDER', 'mahalle', 'ŞAMLAR', '(535) 575-9611'),
('RAHMİ GÜR', 'mahalle', 'ZİYAGÖKALP', '(544) 328-2057');

-- ============================================================
-- ÜYE DOSTLARI
-- ============================================================
INSERT INTO kisiler (isim_soyisim, kategori) VALUES
('TARKAN APARİ', 'uye_dostlari');

-- ============================================================
-- BELEDİYE MECLİS ÜYELERİ (23 kişi)
-- Not: AKİF BİLGİÇ İlçe Yönetiminde kayıtlı
-- ============================================================
INSERT INTO kisiler (isim_soyisim, kategori, gorev, telefon) VALUES
('ERCAN ALİOĞLU', 'belediye_meclis', 'İBB', '(534) 597-7255'),
('RESUL KAYA', 'belediye_meclis', 'İBB', '(533) 765-5016'),
('NURDAN ERTUĞRUL', 'belediye_meclis', 'İBB', '(533) 236-0360'),
('AHMET OCAKÇI', 'belediye_meclis', 'İBB', '(554) 979-3552'),
('MURAT ŞAHİN', 'belediye_meclis', 'İBB', '(532) 345-3441'),
('ÖMER FARUK AY', 'belediye_meclis', 'İLÇE', '(507) 641-4308'),
('EVREN ÖZKAN', 'belediye_meclis', 'İLÇE', '(533) 518-3764'),
('HASAN MALKOÇ', 'belediye_meclis', 'İLÇE', '(532) 233-6604'),
('SALİH GEDİKOĞLU', 'belediye_meclis', 'İLÇE', '(561) 614-9561'),
('BARIŞCAN KISACIK', 'belediye_meclis', 'İLÇE', '(537) 438-1764'),
('VOLKAN KAHRAMAN', 'belediye_meclis', 'İLÇE', '(532) 213-9313'),
('FATİH KOÇKAR', 'belediye_meclis', 'İLÇE', '(532) 607-1334'),
('ONUR GÖZEN', 'belediye_meclis', 'İLÇE', '(532) 401-2727'),
('AHMET MELİK', 'belediye_meclis', 'İLÇE', '(505) 222-4167'),
('NEBAHAT ERKESİM', 'belediye_meclis', 'İLÇE', '(544) 859-3322'),
('ABDULLAH AYDIN', 'belediye_meclis', 'İLÇE', '(552) 222-2249'),
('ELİF AĞILLI', 'belediye_meclis', 'İLÇE', '(534) 923-6302'),
('PERİHAN BANU SAVAŞ', 'belediye_meclis', 'İLÇE', '(532) 616-7947'),
('AHMET AĞIRMAN', 'belediye_meclis', 'İLÇE', '(532) 282-7701'),
('BİRSEN AYVAZ', 'belediye_meclis', 'İLÇE', '(532) 666-6961'),
('ERTAN AKBAL', 'belediye_meclis', 'İLÇE', '(532) 514-9576'),
('MUSTAFA TEKDEN', 'belediye_meclis', 'İLÇE', '(532) 202-5160'),
('CANAN ÖZBEK', 'belediye_meclis', 'İLÇE', '(532) 160-1944');

-- ============================================================
-- ÖRNEK ÜYE KULLANICILARI (isteğe bağlı)
-- ============================================================
-- Üye eklemek için bu formatı kullanın:
-- INSERT INTO kullanicilar (username, password, display_name, rol, isim_soyisim)
-- VALUES ('tarkan', 'tarkan123', 'Tarkan Apari', 'uye', 'TARKAN APARİ');
