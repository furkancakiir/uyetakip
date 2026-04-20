"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const BOSH_FORM = {
  tutanak_tarih: new Date().toISOString().split("T")[0],
  tutanak_no: "", isim_soyisim: "",
  teslim_edilen: "", toplam_yapilabilir: "", yeni_uye: "",
  silinmis_uye: "", secmen_olmayan: "", il_ilce_disi: "",
  mukerrer: "", baska_parti_uyesi: "", tc_seri_no_hatali: "",
  imzasiz: "", notlar: "",
};

const ALANLAR = [
  { key: "teslim_edilen", label: "Teslim Edilen", short: "Teslim" },
  { key: "toplam_yapilabilir", label: "Toplam Yapılabilir", short: "Yapılabilir" },
  { key: "yeni_uye", label: "Yeni Üye", short: "Yeni Üye" },
  { key: "silinmis_uye", label: "Silinmiş Üye", short: "Silinmiş" },
  { key: "secmen_olmayan", label: "Seçmen Olmayan", short: "Seçmen Dışı" },
  { key: "il_ilce_disi", label: "İl/İlçe Dışı", short: "İl/İlçe Dışı" },
  { key: "mukerrer", label: "Mükerrer", short: "Mükerrer" },
  { key: "baska_parti_uyesi", label: "Başka Parti Üyesi", short: "B. Parti" },
  { key: "tc_seri_no_hatali", label: "TC/Seri No Hatalı", short: "TC Hatalı" },
  { key: "imzasiz", label: "İmzasız", short: "İmzasız" },
];

const KAT_LABELS = {
  ilce_yonetimi: { label: "İlçe Yönetimi", short: "İlçe Yön.", icon: "🏛️" },
  mahalle: { label: "Mahalle Başkanları", short: "Mahalle", icon: "🏘️" },
  kadin_kollari: { label: "Kadın Kolları", short: "Kadın K.", icon: "👩" },
  kadin_mahalle: { label: "Kadın Kolları Mahalle", short: "KK Mah.", icon: "👩‍👧" },
  uye_dostlari: { label: "Üye Dostları", short: "Dostlar", icon: "💪" },
  belediye_meclis: { label: "Belediye Meclis Üyeleri", short: "Meclis", icon: "🏢" },
};

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [screen, setScreen] = useState("login");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginHata, setLoginHata] = useState("");
  const [kullanici, setKullanici] = useState(null);
  const [form, setForm] = useState(BOSH_FORM);
  const [kayitlar, setKayitlar] = useState([]);
  const [kisiler, setKisiler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [filtre, setFiltre] = useState("");
  const [silOnay, setSilOnay] = useState(null);
  const [hataliUyari, setHataliUyari] = useState(0);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [yeniKullanici, setYeniKullanici] = useState({ username: "", password: "", display_name: "", rol: "uye", isim_soyisim: "" });
  const [kullaniciMesaj, setKullaniciMesaj] = useState("");
  const [aktifKategori, setAktifKategori] = useState("ilce_yonetimi");
  const [gorunumModu, setGorunumModu] = useState("kisiler");
  const [seciliKisi, setSeciliKisi] = useState(null);
  const [duzenleKayit, setDuzenleKayit] = useState(null);
  const [kisiModal, setKisiModal] = useState(false);
  const [yeniKisi, setYeniKisi] = useState({ isim_soyisim: "", kategori: "ilce_yonetimi", mahalle: "", gorev: "", hedef: "" });
  const [kisiMesaj, setKisiMesaj] = useState("");
  const [hedefDuzenle, setHedefDuzenle] = useState(null);
  const [seciliMahalle, setSeciliMahalle] = useState(null);
  const [raporFiltre, setRaporFiltre] = useState("tumu");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    kisileriYukle();
    const saved = localStorage.getItem("tutanak_auth");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setKullanici(u);
        setScreen(u.rol === "admin" ? "form" : "liste");
        yukle(u);
        if (u.rol === "uye" && u.isim_soyisim) hataliSayisiGetir(u.isim_soyisim);
        if (u.rol === "admin") kullanicilariYukle();
      } catch {}
    }
  }, []);

  async function kisileriYukle() {
    const { data } = await supabase.from("kisiler").select("*").eq("is_active", true).order("isim_soyisim");
    if (data) setKisiler(data);
  }

  function kisilerByKategori(kat) {
    return kisiler.filter(k => k.kategori === kat);
  }

  function getMahalleler() {
    const mahalleSet = new Set();
    kisiler.forEach(k => {
      if (k.mahalle) mahalleSet.add(k.mahalle);
    });
    return [...mahalleSet].sort();
  }

  async function giris() {
    setLoginHata("");
    const { data, error } = await supabase.from("kullanicilar").select("*")
      .eq("username", loginForm.username.toLowerCase().trim())
      .eq("password", loginForm.password)
      .eq("is_active", true).single();
    if (error || !data) { setLoginHata("Kullanıcı adı veya şifre hatalı"); return; }
    localStorage.setItem("tutanak_auth", JSON.stringify(data));
    setKullanici(data);
    setScreen(data.rol === "admin" ? "form" : "liste");
    yukle(data);
    if (data.rol === "uye" && data.isim_soyisim) hataliSayisiGetir(data.isim_soyisim);
    if (data.rol === "admin") kullanicilariYukle();
  }

  async function yukle(u) {
    let query = supabase.from("tutanak_kayitlari").select("*").order("tutanak_tarih", { ascending: false });
    if (u.rol === "uye" && u.isim_soyisim) query = query.eq("isim_soyisim", u.isim_soyisim);
    const { data } = await query;
    if (data) setKayitlar(data);
  }

  async function hataliSayisiGetir(isim) {
    const { data } = await supabase.from("tutanak_kayitlari").select("tc_seri_no_hatali").eq("isim_soyisim", isim);
    if (data) setHataliUyari(data.reduce((s, k) => s + (k.tc_seri_no_hatali || 0), 0));
  }

  async function kullanicilariYukle() {
    const { data } = await supabase.from("kullanicilar").select("*").order("created_at", { ascending: false });
    if (data) setKullanicilar(data);
  }

  async function kullaniciEkle() {
    if (!yeniKullanici.username || !yeniKullanici.password || !yeniKullanici.display_name) {
      setKullaniciMesaj("❌ Tüm alanları doldurun"); return;
    }
    if (yeniKullanici.rol === "uye" && !yeniKullanici.isim_soyisim) {
      setKullaniciMesaj("❌ Üye için isim seçin"); return;
    }
    const { error } = await supabase.from("kullanicilar").insert([{
      username: yeniKullanici.username.toLowerCase().trim(),
      password: yeniKullanici.password,
      display_name: yeniKullanici.display_name,
      rol: yeniKullanici.rol,
      isim_soyisim: yeniKullanici.rol === "uye" ? yeniKullanici.isim_soyisim : null
    }]);
    if (error) {
      setKullaniciMesaj("❌ " + (error.message.includes("duplicate") ? "Bu kullanıcı adı zaten var" : error.message));
      return;
    }
    setKullaniciMesaj("✅ Kullanıcı eklendi!");
    setYeniKullanici({ username: "", password: "", display_name: "", rol: "uye", isim_soyisim: "" });
    kullanicilariYukle();
    setTimeout(() => setKullaniciMesaj(""), 3000);
  }

  async function kullaniciSil(id) {
    await supabase.from("kullanicilar").delete().eq("id", id);
    kullanicilariYukle();
  }

  async function kisiEkle() {
    if (!yeniKisi.isim_soyisim.trim()) {
      setKisiMesaj("❌ İsim soyisim zorunlu");
      return;
    }
    const isim = yeniKisi.isim_soyisim.trim().toUpperCase();
    const { error } = await supabase.from("kisiler").insert([{
      isim_soyisim: isim,
      kategori: yeniKisi.kategori,
      mahalle: yeniKisi.mahalle.trim() || null,
      gorev: yeniKisi.gorev.trim() || null,
      hedef: yeniKisi.hedef ? parseInt(yeniKisi.hedef) : 0,
      is_active: true
    }]);
    if (error) {
      setKisiMesaj("❌ " + (error.message.includes("duplicate") ? "Bu kişi zaten var" : error.message));
      return;
    }
    setKisiMesaj("✅ Kişi eklendi!");
    setYeniKisi({ isim_soyisim: "", kategori: yeniKisi.kategori, mahalle: "", gorev: "", hedef: "" });
    kisileriYukle();
    setTimeout(() => setKisiMesaj(""), 3000);
  }

  async function hedefGuncelle(kisiId, yeniHedef) {
    const { error } = await supabase.from("kisiler").update({ hedef: parseInt(yeniHedef) || 0 }).eq("id", kisiId);
    if (!error) {
      kisileriYukle();
      setHedefDuzenle(null);
    }
  }

  async function kisiSil(id) {
    const kisi = kisiler.find(k => k.id === id);
    if (!kisi) return;
    if (!confirm(`${kisi.isim_soyisim} kişisini ve tüm kayıtlarını silmek istediğinize emin misiniz?`)) return;
    await supabase.from("tutanak_kayitlari").delete().eq("isim_soyisim", kisi.isim_soyisim);
    await supabase.from("kisiler").delete().eq("id", id);
    kisileriYukle();
    yukle(kullanici);
  }

  // Telegram bildirim fonksiyonu
  async function telegramBildirimGonder(telegramId, isim, kayit) {
    const TELEGRAM_API = "https://api.telegram.org/bot8685265365:AAFVhfEyu93a5THUFGh83YBEpbNhFBeDMa4/sendMessage";
    
    const tarih = new Date().toLocaleDateString("tr-TR");
    const saat = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    
    let mesaj = `📋 *YENİ TUTANAK KAYDI*\n`;
    mesaj += `━━━━━━━━━━━━━━━━━━\n\n`;
    mesaj += `👤 *${isim}*\n`;
    mesaj += `📅 ${tarih} - ${saat}\n\n`;
    
    mesaj += `📊 *ÖZET*\n`;
    mesaj += `├ 📦 Teslim Edilen: *${kayit.teslim_edilen || 0}*\n`;
    mesaj += `├ ✅ Yeni Üye: *${kayit.yeni_uye || 0}*\n`;
    mesaj += `├ 🔄 Mükerrer: *${kayit.mukerrer || 0}*\n`;
    mesaj += `└ ❌ Silinmiş: *${kayit.silinmis_uye || 0}*\n\n`;
    
    // Hatalı kayıt varsa uyarı
    if (kayit.tc_seri_no_hatali > 0) {
      mesaj += `⚠️ *DİKKAT!*\n`;
      mesaj += `🔴 *${kayit.tc_seri_no_hatali} adet TC/Seri No hatalı* kaydınız var!\n`;
      mesaj += `📍 Lütfen en kısa sürede *Bilgi İşlem'den* formlarınızı alınız.\n\n`;
    }
    
    // İmzasız varsa uyarı
    if (kayit.imzasiz > 0) {
      mesaj += `✍️ *${kayit.imzasiz} adet imzasız* form tespit edildi.\n\n`;
    }
    
    mesaj += `━━━━━━━━━━━━━━━━━━\n`;
    mesaj += `🏛️ AK Parti Başakşehir\n`;
    mesaj += `💻 BİT Komisyonu`;
    
    try {
      await fetch(TELEGRAM_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: telegramId, 
          text: mesaj,
          parse_mode: "Markdown"
        }),
      });
    } catch (e) { console.log("Telegram bildirim hatası:", e); }
  }

  async function kaydet() {
    if (!form.isim_soyisim) { setMesaj("❌ İsim soyisim zorunlu"); return; }
    setYukleniyor(true);
    const kayit = {};
    Object.keys(BOSH_FORM).forEach(k => {
      if (ALANLAR.find(a => a.key === k)) kayit[k] = form[k] === "" ? 0 : parseInt(form[k]) || 0;
      else kayit[k] = form[k] || null;
    });
    kayit.olusturan = kullanici?.display_name;
    
    if (duzenleKayit) {
      const { error } = await supabase.from("tutanak_kayitlari").update(kayit).eq("id", duzenleKayit.id);
      setYukleniyor(false);
      if (error) { setMesaj("❌ " + error.message); return; }
      setMesaj("✅ Güncellendi!");
      setDuzenleKayit(null);
    } else {
      const { error } = await supabase.from("tutanak_kayitlari").insert([kayit]);
      setYukleniyor(false);
      if (error) { setMesaj("❌ " + error.message); return; }
      setMesaj("✅ Kaydedildi!");
      
      // Telegram bildirimi gönder
      const kisi = kisiler.find(k => k.isim_soyisim === form.isim_soyisim);
      if (kisi?.telegram_id) {
        telegramBildirimGonder(kisi.telegram_id, form.isim_soyisim, kayit);
      }
    }
    
    setForm({ ...BOSH_FORM, tutanak_tarih: form.tutanak_tarih });
    yukle(kullanici);
    setTimeout(() => setMesaj(""), 3000);
  }

  function duzenle(kayit) {
    setDuzenleKayit(kayit);
    setForm({
      tutanak_tarih: kayit.tutanak_tarih || "",
      tutanak_no: kayit.tutanak_no || "",
      isim_soyisim: kayit.isim_soyisim || "",
      teslim_edilen: kayit.teslim_edilen?.toString() || "",
      toplam_yapilabilir: kayit.toplam_yapilabilir?.toString() || "",
      yeni_uye: kayit.yeni_uye?.toString() || "",
      silinmis_uye: kayit.silinmis_uye?.toString() || "",
      secmen_olmayan: kayit.secmen_olmayan?.toString() || "",
      il_ilce_disi: kayit.il_ilce_disi?.toString() || "",
      mukerrer: kayit.mukerrer?.toString() || "",
      baska_parti_uyesi: kayit.baska_parti_uyesi?.toString() || "",
      tc_seri_no_hatali: kayit.tc_seri_no_hatali?.toString() || "",
      imzasiz: kayit.imzasiz?.toString() || "",
      notlar: kayit.notlar || "",
    });
    setScreen("form");
  }

  function iptalDuzenle() {
    setDuzenleKayit(null);
    setForm(BOSH_FORM);
  }

  async function sil(id) {
    await supabase.from("tutanak_kayitlari").delete().eq("id", id);
    setSilOnay(null);
    yukle(kullanici);
  }

  function cikis() {
    localStorage.removeItem("tutanak_auth");
    setKullanici(null);
    setKayitlar([]);
    setScreen("login");
    setLoginForm({ username: "", password: "" });
  }

  const isAdmin = kullanici?.rol === "admin";
  const aktifKisiIsimleri = kisiler.map(k => k.isim_soyisim);
  
  // Tarih filtreleme
  function tarihFiltrele(kayitlar) {
    if (raporFiltre === "tumu") return kayitlar;
    
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    
    return kayitlar.filter(k => {
      const kayitTarih = new Date(k.tutanak_tarih);
      kayitTarih.setHours(0, 0, 0, 0);
      
      if (raporFiltre === "bugun") {
        return kayitTarih.getTime() === bugun.getTime();
      }
      if (raporFiltre === "hafta") {
        const haftaBasi = new Date(bugun);
        haftaBasi.setDate(bugun.getDate() - bugun.getDay() + 1); // Pazartesi
        return kayitTarih >= haftaBasi;
      }
      if (raporFiltre === "ay") {
        return kayitTarih.getMonth() === bugun.getMonth() && kayitTarih.getFullYear() === bugun.getFullYear();
      }
      return true;
    });
  }
  
  const aktifKayitlar = tarihFiltrele(kayitlar.filter(k => aktifKisiIsimleri.includes(k.isim_soyisim)));

  const filtreliKategori = isAdmin
    ? aktifKayitlar.filter(k => kisilerByKategori(aktifKategori).some(p => p.isim_soyisim === k.isim_soyisim))
        .filter(k => !filtre || k.isim_soyisim.toLowerCase().includes(filtre.toLowerCase()))
    : aktifKayitlar.filter(k => !filtre || k.isim_soyisim.toLowerCase().includes(filtre.toLowerCase()));

  const kisiOzeti = kisilerByKategori(aktifKategori).map(kisi => {
    const kisiKayitlari = kayitlar.filter(k => k.isim_soyisim === kisi.isim_soyisim);
    return {
      id: kisi.id,
      isim: kisi.isim_soyisim,
      mahalle: kisi.mahalle || "",
      hedef: kisi.hedef || 0,
      kayit: kisiKayitlari.length,
      teslim: kisiKayitlari.reduce((s, k) => s + (k.teslim_edilen || 0), 0),
      yeni: kisiKayitlari.reduce((s, k) => s + (k.yeni_uye || 0), 0),
      muk: kisiKayitlari.reduce((s, k) => s + (k.mukerrer || 0), 0),
    };
  }).filter(k => !filtre || k.isim.toLowerCase().includes(filtre.toLowerCase()))
    .sort((a, b) => b.yeni - a.yeni);

  const raporToplam = {
    teslim: aktifKayitlar.reduce((s, k) => s + (k.teslim_edilen || 0), 0),
    yeni: aktifKayitlar.reduce((s, k) => s + (k.yeni_uye || 0), 0),
    muk: aktifKayitlar.reduce((s, k) => s + (k.mukerrer || 0), 0),
    hatali: aktifKayitlar.reduce((s, k) => s + (k.tc_seri_no_hatali || 0), 0),
  };

  function kategoriRapor(katKey) {
    const katKisiler = kisilerByKategori(katKey).map(k => k.isim_soyisim);
    const katKayitlar = aktifKayitlar.filter(k => katKisiler.includes(k.isim_soyisim));
    return {
      teslim: katKayitlar.reduce((s, k) => s + (k.teslim_edilen || 0), 0),
      yeni: katKayitlar.reduce((s, k) => s + (k.yeni_uye || 0), 0),
    };
  }

  function kadinKollariToplamRapor() {
    const kkYonetim = kategoriRapor("kadin_kollari");
    const kkMahalle = kategoriRapor("kadin_mahalle");
    return { teslim: kkYonetim.teslim + kkMahalle.teslim, yeni: kkYonetim.yeni + kkMahalle.yeni };
  }

  function mahalleBazliRapor() {
    const mahalleler = getMahalleler();
    return mahalleler.map(mahalle => {
      const mahalleKisiler = kisiler.filter(k => k.mahalle === mahalle);
      const baskanIsimleri = mahalleKisiler.map(k => k.isim_soyisim);
      const mahalleKayitlar = aktifKayitlar.filter(k => baskanIsimleri.includes(k.isim_soyisim));
      const toplamHedef = mahalleKisiler.reduce((s, k) => s + (k.hedef || 0), 0);
      return {
        mahalle,
        kisiler: mahalleKisiler,
        anaKademe: mahalleKisiler.filter(k => ["ilce_yonetimi", "mahalle"].includes(k.kategori)).map(k => k.isim_soyisim),
        kadinKollari: mahalleKisiler.filter(k => ["kadin_kollari", "kadin_mahalle"].includes(k.kategori)).map(k => k.isim_soyisim),
        hedef: toplamHedef,
        teslim: mahalleKayitlar.reduce((s, k) => s + (k.teslim_edilen || 0), 0),
        yeni: mahalleKayitlar.reduce((s, k) => s + (k.yeni_uye || 0), 0),
        muk: mahalleKayitlar.reduce((s, k) => s + (k.mukerrer || 0), 0),
      };
    }).sort((a, b) => b.yeni - a.yeni);
  }

  const mahalleRaporu = mahalleBazliRapor();

  function mahalleDetay(mahalle) {
    const mahalleKisiler = kisiler.filter(k => k.mahalle === mahalle);
    return mahalleKisiler.map(kisi => {
      const kisiKayitlari = aktifKayitlar.filter(k => k.isim_soyisim === kisi.isim_soyisim);
      return {
        id: kisi.id,
        isim: kisi.isim_soyisim,
        kategori: kisi.kategori,
        hedef: kisi.hedef || 0,
        teslim: kisiKayitlari.reduce((s, k) => s + (k.teslim_edilen || 0), 0),
        yeni: kisiKayitlari.reduce((s, k) => s + (k.yeni_uye || 0), 0),
        muk: kisiKayitlari.reduce((s, k) => s + (k.mukerrer || 0), 0),
      };
    }).sort((a, b) => b.yeni - a.yeni);
  }

  const styles = {
    container: { minHeight: "100vh", background: "#F0F2F5", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", paddingBottom: isMobile && isAdmin ? 70 : 20 },
    loginWrap: { minHeight: "100vh", background: "linear-gradient(135deg, #1A2942 0%, #2d4a6f 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    loginBox: { background: "#fff", borderRadius: 16, padding: isMobile ? "28px 20px" : "40px 36px", width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
    header: { background: "#1A2942", padding: isMobile ? "12px 16px" : "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 },
    bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#1A2942", display: "flex", justifyContent: "space-around", padding: "10px 0", zIndex: 100 },
    sideNav: { width: 220, background: "#1A2942", minHeight: "calc(100vh - 60px)", padding: "20px 0", position: "fixed", left: 0, top: 60 },
    sideNavBtn: { width: "100%", padding: "14px 24px", background: "transparent", border: "none", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500 },
    content: { padding: isMobile ? 12 : 24, maxWidth: isMobile ? 500 : 1100, margin: isMobile ? "0 auto" : "0 auto 0 240px" },
    card: { background: "#fff", borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: isMobile ? 12 : 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
    cardTitle: { fontSize: isMobile ? 15 : 18, fontWeight: 700, color: "#1A2942", marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #F4A620" },
    label: { display: "block", fontSize: isMobile ? 12 : 13, fontWeight: 600, color: "#555", marginBottom: 6 },
    input: { width: "100%", padding: isMobile ? "12px" : "10px 14px", border: "1px solid #ddd", borderRadius: 8, fontSize: isMobile ? 16 : 14, boxSizing: "border-box" },
    btn: { padding: isMobile ? "14px 20px" : "12px 24px", background: "#1A2942", color: "#fff", border: "none", borderRadius: 8, fontSize: isMobile ? 16 : 14, fontWeight: 600, cursor: "pointer" },
    tabsRow: { display: "flex", gap: isMobile ? 6 : 8, marginBottom: isMobile ? 12 : 16, overflowX: "auto", paddingBottom: 4, flexWrap: isMobile ? "nowrap" : "wrap" },
    tab: { padding: isMobile ? "8px 10px" : "10px 16px", border: "none", borderRadius: 8, fontSize: isMobile ? 11 : 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
    summaryRow: { display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 8 : 16, marginBottom: isMobile ? 12 : 20 },
    summaryCard: { background: "#fff", borderRadius: 10, padding: isMobile ? "14px 10px" : "20px 16px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
    summaryVal: { fontSize: isMobile ? 24 : 32, fontWeight: 700, color: "#1A2942" },
    summaryLbl: { fontSize: isMobile ? 11 : 13, color: "#888", marginTop: 4 },
    personCard: { background: "#fff", borderRadius: 10, padding: isMobile ? 14 : 18, marginBottom: isMobile ? 8 : 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", cursor: "pointer" },
    totalBar: { background: "#1A2942", color: "#fff", borderRadius: 10, padding: isMobile ? 14 : 18, marginTop: 12 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 12 : 16 },
    grid5: { display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(5, 1fr)", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 16 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
    th: { background: "#f5f5f5", padding: "12px 10px", textAlign: "left", fontWeight: 600, borderBottom: "2px solid #ddd", whiteSpace: "nowrap" },
    td: { padding: "12px 10px", borderBottom: "1px solid #eee" },
    msg: { padding: isMobile ? 10 : 12, borderRadius: 8, fontSize: 13, marginBottom: 12 },
    badge: { padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700 },
    userRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #eee" },
    mahalleBadge: { fontSize: 10, background: "#e3f2fd", color: "#1565c0", padding: "2px 6px", borderRadius: 4, marginLeft: 6 },
  };

  if (screen === "login") {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginBox}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#F4A620", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>BİLGİ VE İLETİŞİM TEKNOLOJİLERİ KOMİSYONU</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1A2942" }}>Üye Takip Sistemi</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Kullanıcı Adı</label>
            <input style={styles.input} value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} onKeyDown={e => e.key === "Enter" && giris()} autoFocus />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Şifre</label>
            <input style={styles.input} type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && giris()} />
          </div>
          {loginHata && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{loginHata}</div>}
          <button style={{ ...styles.btn, width: "100%" }} onClick={giris}>Giriş Yap</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={{ color: "#F4A620", fontWeight: 700, fontSize: isMobile ? 10 : 11 }}>BİLGİ VE İLETİŞİM TEKNOLOJİLERİ KOMİSYONU</div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: isMobile ? 14 : 18 }}>Üye Takip Sistemi</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#8A9BB5", fontSize: isMobile ? 11 : 13 }}>{kullanici?.display_name}</span>
          <button style={{ padding: "8px 16px", background: "transparent", color: "#ff6b6b", border: "1px solid #ff6b6b", borderRadius: 6, fontSize: 12, cursor: "pointer" }} onClick={cikis}>Çıkış</button>
        </div>
      </div>

      {!isMobile && isAdmin && (
        <div style={styles.sideNav}>
          {[
            { key: "form", icon: "📝", label: "Yeni Kayıt" },
            { key: "liste", icon: "📊", label: "Liste" },
            { key: "mahalleler", icon: "🏘️", label: "Mahalleler" },
            { key: "rapor", icon: "📈", label: "Raporlar" },
            { key: "kullanicilar", icon: "👥", label: "Kullanıcılar" },
          ].map(item => (
            <button key={item.key} style={{ ...styles.sideNavBtn, background: screen === item.key ? "rgba(244,166,32,0.15)" : "transparent", color: screen === item.key ? "#F4A620" : "#8A9BB5", borderLeft: screen === item.key ? "3px solid #F4A620" : "3px solid transparent" }}
              onClick={() => { setScreen(item.key); setSeciliMahalle(null); if (["liste", "rapor", "mahalleler"].includes(item.key)) yukle(kullanici); if (item.key === "kullanicilar") kullanicilariYukle(); if (item.key === "form") iptalDuzenle(); }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      )}

      {isMobile && isAdmin && (
        <div style={styles.bottomNav}>
          {[
            { key: "form", icon: "📝", label: "Kayıt" },
            { key: "liste", icon: "📊", label: "Liste" },
            { key: "mahalleler", icon: "🏘️", label: "Mahalle" },
            { key: "rapor", icon: "📈", label: "Rapor" },
            { key: "kullanicilar", icon: "👥", label: "Kullanıcı" },
          ].map(item => (
            <button key={item.key} style={{ background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", color: screen === item.key ? "#F4A620" : "#8A9BB5" }}
              onClick={() => { setScreen(item.key); setSeciliMahalle(null); if (["liste", "rapor", "mahalleler"].includes(item.key)) yukle(kullanici); if (item.key === "kullanicilar") kullanicilariYukle(); if (item.key === "form") iptalDuzenle(); }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span><span style={{ fontSize: 10 }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <div style={styles.content}>
        {/* FORM EKRANI */}
        {screen === "form" && isAdmin && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>{duzenleKayit ? "✏️ Kayıt Düzenle" : "📝 Yeni Tutanak Kaydı"}</div>
            {duzenleKayit && (
              <div style={{ background: "#e3f2fd", padding: 12, borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13 }}>📝 <strong>{duzenleKayit.isim_soyisim}</strong></span>
                <button style={{ fontSize: 12, background: "#c0392b", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }} onClick={iptalDuzenle}>İptal</button>
              </div>
            )}
            <div style={styles.grid2}>
              <div><label style={styles.label}>Tarih</label><input style={styles.input} type="date" value={form.tutanak_tarih} onChange={e => setForm(p => ({ ...p, tutanak_tarih: e.target.value }))} /></div>
              <div><label style={styles.label}>Tutanak No</label><input style={styles.input} placeholder="AK00001" value={form.tutanak_no} onChange={e => setForm(p => ({ ...p, tutanak_no: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>İsim Soyisim *</label>
              <select style={styles.input} value={form.isim_soyisim} onChange={e => setForm(p => ({ ...p, isim_soyisim: e.target.value }))}>
                <option value="">-- Seçiniz --</option>
                {Object.entries(KAT_LABELS).map(([key, val]) => (
                  <optgroup key={key} label={`${val.icon} ${val.label}`}>
                    {kisilerByKategori(key).map(k => <option key={k.id} value={k.isim_soyisim}>{k.isim_soyisim}{k.mahalle ? ` (${k.mahalle})` : ""}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div style={styles.grid5}>
              {ALANLAR.map(a => (
                <div key={a.key}>
                  <label style={{ ...styles.label, fontSize: isMobile ? 10 : 12 }}>{isMobile ? a.short : a.label}</label>
                  <input style={{ ...styles.input, textAlign: "center", background: a.key === "tc_seri_no_hatali" ? "#FFF8E1" : "#fff" }} type="number" min="0" placeholder="0" value={form[a.key]} onChange={e => setForm(p => ({ ...p, [a.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 20 }}><label style={styles.label}>Notlar</label><input style={styles.input} placeholder="Özel not..." value={form.notlar} onChange={e => setForm(p => ({ ...p, notlar: e.target.value }))} /></div>
            {mesaj && <div style={{ ...styles.msg, background: mesaj.startsWith("✅") ? "#e8f5e9" : "#fdecea", color: mesaj.startsWith("✅") ? "#2e7d32" : "#c0392b" }}>{mesaj}</div>}
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ ...styles.btn, flex: 1, background: duzenleKayit ? "#2e7d32" : "#1A2942" }} onClick={kaydet} disabled={yukleniyor}>{yukleniyor ? "..." : duzenleKayit ? "✅ Güncelle" : "💾 Kaydet"}</button>
              <button style={{ ...styles.btn, background: "#e0e0e0", color: "#555" }} onClick={() => { setForm(BOSH_FORM); setDuzenleKayit(null); }}>Temizle</button>
            </div>
          </div>
        )}

        {/* LİSTE EKRANI */}
        {screen === "liste" && (
          <div>
            {isAdmin && (
              <div style={styles.tabsRow}>
                {Object.entries(KAT_LABELS).map(([key, val]) => (
                  <button key={key} onClick={() => setAktifKategori(key)} style={{ ...styles.tab, background: aktifKategori === key ? "#1A2942" : "#fff", color: aktifKategori === key ? "#fff" : "#555" }}>
                    {val.icon} {isMobile ? val.short : val.label}
                  </button>
                ))}
              </div>
            )}
            {isAdmin && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setGorunumModu("kisiler")} style={{ ...styles.tab, background: gorunumModu === "kisiler" ? "#2e7d32" : "#e0e0e0", color: gorunumModu === "kisiler" ? "#fff" : "#555" }}>👥 Kişiler</button>
                <button onClick={() => setGorunumModu("kayitlar")} style={{ ...styles.tab, background: gorunumModu === "kayitlar" ? "#2e7d32" : "#e0e0e0", color: gorunumModu === "kayitlar" ? "#fff" : "#555" }}>📋 Kayıtlar</button>
                <button onClick={() => { setKisiModal(true); setYeniKisi(p => ({ ...p, kategori: aktifKategori })); }} style={{ ...styles.tab, background: "#F4A620", color: "#1A2942", marginLeft: "auto" }}>➕ Kişi Ekle</button>
              </div>
            )}
            <input style={{ ...styles.input, marginBottom: 16 }} placeholder="🔍 İsim ara..." value={filtre} onChange={e => setFiltre(e.target.value)} />

            {isAdmin && gorunumModu === "kisiler" && (
              <div>
                {!isMobile ? (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>İsim Soyisim</th>
                        <th style={styles.th}>Mahalle</th>
                        <th style={{ ...styles.th, textAlign: "center" }}>Hedef</th>
                        <th style={{ ...styles.th, textAlign: "center", color: "#2e7d32" }}>Yeni Üye</th>
                        <th style={{ ...styles.th, textAlign: "center" }}>İlerleme</th>
                        <th style={{ ...styles.th, textAlign: "center" }}>Teslim</th>
                        <th style={{ ...styles.th, textAlign: "center", color: "#c0392b" }}>Mük.</th>
                        <th style={styles.th}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kisiOzeti.map(k => {
                        const ilerlemeYuzde = k.hedef > 0 ? Math.min(100, Math.round((k.yeni / k.hedef) * 100)) : 0;
                        const hedefDurumu = k.hedef > 0 ? (k.yeni >= k.hedef ? "tamamlandi" : k.yeni >= k.hedef * 0.7 ? "yaklasti" : "devam") : "yok";
                        return (
                          <tr key={k.isim} style={{ background: k.kayit === 0 ? "#FFF8E1" : hedefDurumu === "tamamlandi" ? "#e8f5e9" : "#fff" }}>
                            <td style={styles.td}><strong>{k.isim}</strong>{k.kayit === 0 && <span style={{ fontSize: 11, color: "#FF8F00", marginLeft: 8 }}>⚠️</span>}</td>
                            <td style={styles.td}><span style={styles.mahalleBadge}>{k.mahalle || "-"}</span></td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {hedefDuzenle === k.id ? (
                                <input type="number" min="0" style={{ width: 60, padding: 4, textAlign: "center", border: "1px solid #ddd", borderRadius: 4 }} defaultValue={k.hedef} autoFocus
                                  onBlur={(e) => hedefGuncelle(k.id, e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") hedefGuncelle(k.id, e.target.value); if (e.key === "Escape") setHedefDuzenle(null); }} />
                              ) : (
                                <span style={{ cursor: "pointer", padding: "2px 8px", background: "#f0f0f0", borderRadius: 4 }} onClick={() => setHedefDuzenle(k.id)}>{k.hedef || "—"}</span>
                              )}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: "#2e7d32" }}>{k.yeni}</td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {k.hedef > 0 ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <div style={{ width: 60, height: 8, background: "#e0e0e0", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{ width: `${ilerlemeYuzde}%`, height: "100%", background: hedefDurumu === "tamamlandi" ? "#2e7d32" : hedefDurumu === "yaklasti" ? "#F4A620" : "#1A2942" }}></div>
                                  </div>
                                  <span style={{ fontSize: 11 }}>%{ilerlemeYuzde}</span>
                                </div>
                              ) : <span style={{ color: "#999", fontSize: 11 }}>—</span>}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>{k.teslim}</td>
                            <td style={{ ...styles.td, textAlign: "center", color: k.muk > 0 ? "#c0392b" : "inherit" }}>{k.muk}</td>
                            <td style={styles.td}><button style={{ fontSize: 14, background: "transparent", border: "none", cursor: "pointer" }} onClick={() => kisiSil(k.id)}>🗑️</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div>
                    {kisiOzeti.map(k => (
                      <div key={k.isim} style={{ ...styles.personCard }} onClick={() => setSeciliKisi(seciliKisi === k.isim ? null : k.isim)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div><div style={{ fontWeight: 600, fontSize: 14 }}>{k.isim}</div>{k.mahalle && <span style={styles.mahalleBadge}>{k.mahalle}</span>}</div>
                          <div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 700, color: "#2e7d32" }}>{k.yeni}</div></div>
                        </div>
                        {seciliKisi === k.isim && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, marginBottom: 10 }}>
                              <div>Hedef: <strong>{k.hedef || "—"}</strong></div>
                              <div>Teslim: <strong>{k.teslim}</strong></div>
                            </div>
                            <button style={{ fontSize: 12, background: "#fdecea", color: "#c0392b", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); kisiSil(k.id); }}>🗑️ Sil</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(gorunumModu === "kayitlar" || !isAdmin) && (
              <div>
                {filtreliKategori.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#999" }}>Kayıt bulunamadı</div>}
                {filtreliKategori.map(k => (
                  <div key={k.id} style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div><div style={{ fontWeight: 600, fontSize: 14 }}>{k.isim_soyisim}</div><div style={{ fontSize: 11, color: "#888" }}>{k.tutanak_tarih}</div></div>
                      <div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 700, color: "#2e7d32" }}>{k.yeni_uye}</div></div>
                    </div>
                    {isAdmin && (
                      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button style={{ fontSize: 13, background: "#e3f2fd", color: "#1565c0", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer" }} onClick={() => duzenle(k)}>✏️</button>
                        <button style={{ fontSize: 13, background: "#fdecea", color: "#c0392b", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer" }} onClick={() => sil(k.id)}>🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MAHALLELER EKRANI */}
        {screen === "mahalleler" && isAdmin && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>🏘️ Mahalleler ({getMahalleler().length})</div>
            {!seciliMahalle ? (
              <div>
                {mahalleRaporu.map(m => {
                  const ilerlemeYuzde = m.hedef > 0 ? Math.min(100, Math.round((m.yeni / m.hedef) * 100)) : 0;
                  return (
                    <div key={m.mahalle} style={{ background: "#f9f9f9", borderRadius: 8, padding: 14, marginBottom: 8, cursor: "pointer" }} onClick={() => setSeciliMahalle(m.mahalle)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div><div style={{ fontWeight: 700, fontSize: 15 }}>{m.mahalle}</div><div style={{ fontSize: 11, color: "#888" }}>{m.kisiler.length} kişi</div></div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: "#2e7d32" }}>{m.yeni}{m.hedef > 0 && <span style={{ fontSize: 12, color: "#888", fontWeight: 400 }}>/{m.hedef}</span>}</div>
                          {m.hedef > 0 && (
                            <div style={{ width: 60, height: 6, background: "#e0e0e0", borderRadius: 3, marginTop: 4 }}>
                              <div style={{ width: `${ilerlemeYuzde}%`, height: "100%", background: ilerlemeYuzde >= 100 ? "#2e7d32" : "#F4A620", borderRadius: 3 }}></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={styles.totalBar}>
                  <div style={{ fontWeight: 700 }}>TOPLAM</div>
                  <div style={{ display: "flex", gap: 20, marginTop: 6, fontSize: 14 }}>
                    <span>Hedef: <strong>{mahalleRaporu.reduce((s, m) => s + m.hedef, 0)}</strong></span>
                    <span style={{ color: "#F4A620" }}>Yeni Üye: <strong>{mahalleRaporu.reduce((s, m) => s + m.yeni, 0)}</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <button style={{ ...styles.tab, background: "#e0e0e0", marginBottom: 16 }} onClick={() => setSeciliMahalle(null)}>← Geri</button>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{seciliMahalle}</div>
                {mahalleDetay(seciliMahalle).map(k => (
                  <div key={k.id} style={{ background: "#f9f9f9", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><div style={{ fontWeight: 600 }}>{k.isim}</div><div style={{ fontSize: 11, color: "#888" }}>{KAT_LABELS[k.kategori]?.icon} {KAT_LABELS[k.kategori]?.label}</div></div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#2e7d32" }}>{k.yeni}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RAPOR EKRANI */}
        {screen === "rapor" && isAdmin && (
          <div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>📈 Genel Özet</div>
              
              {/* Tarih Filtreleri */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { key: "bugun", label: "Bugün" },
                  { key: "hafta", label: "Bu Hafta" },
                  { key: "ay", label: "Bu Ay" },
                  { key: "tumu", label: "Tümü" },
                ].map(f => (
                  <button key={f.key} onClick={() => setRaporFiltre(f.key)} style={{ ...styles.tab, background: raporFiltre === f.key ? "#1A2942" : "#e0e0e0", color: raporFiltre === f.key ? "#fff" : "#555" }}>
                    {f.label}
                  </button>
                ))}
              </div>
              
              <div style={styles.summaryRow}>
                <div style={styles.summaryCard}><div style={styles.summaryVal}>{raporToplam.teslim}</div><div style={styles.summaryLbl}>Toplam Teslim</div></div>
                <div style={styles.summaryCard}><div style={{ ...styles.summaryVal, color: "#2e7d32" }}>{raporToplam.yeni}</div><div style={styles.summaryLbl}>Yeni Üye</div></div>
                <div style={styles.summaryCard}><div style={{ ...styles.summaryVal, color: "#c0392b" }}>{raporToplam.muk}</div><div style={styles.summaryLbl}>Mükerrer</div></div>
                <div style={styles.summaryCard}><div style={{ ...styles.summaryVal, color: "#FF8F00" }}>{raporToplam.hatali}</div><div style={styles.summaryLbl}>TC Hatalı</div></div>
              </div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>📊 Kategori Bazlı</div>
              {Object.entries(KAT_LABELS).map(([key, val]) => {
                const rapor = kategoriRapor(key);
                return (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee" }}>
                    <span>{val.icon} {val.label}</span>
                    <div style={{ display: "flex", gap: 20 }}>
                      <span>Teslim: <strong>{rapor.teslim}</strong></span>
                      <span style={{ color: "#2e7d32" }}>Yeni: <strong>{rapor.yeni}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Mahalle Bazlı Özet */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>🏘️ Mahalle Bazlı Özet</div>
              {mahalleRaporu.map(m => {
                const ilerlemeYuzde = m.hedef > 0 ? Math.min(100, Math.round((m.yeni / m.hedef) * 100)) : 0;
                return (
                  <div key={m.mahalle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee" }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{m.mahalle}</span>
                      <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>({m.kisiler.length} kişi)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      {m.hedef > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 50, height: 6, background: "#e0e0e0", borderRadius: 3 }}>
                            <div style={{ width: `${ilerlemeYuzde}%`, height: "100%", background: ilerlemeYuzde >= 100 ? "#2e7d32" : "#F4A620", borderRadius: 3 }}></div>
                          </div>
                          <span style={{ fontSize: 11 }}>%{ilerlemeYuzde}</span>
                        </div>
                      )}
                      <span style={{ color: "#2e7d32", fontWeight: 700 }}>{m.yeni}{m.hedef > 0 && <span style={{ fontWeight: 400, color: "#888" }}>/{m.hedef}</span>}</span>
                    </div>
                  </div>
                );
              })}
              <div style={{ ...styles.totalBar, marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700 }}>TOPLAM</span>
                  <span style={{ color: "#F4A620", fontWeight: 700 }}>{mahalleRaporu.reduce((s, m) => s + m.yeni, 0)} / {mahalleRaporu.reduce((s, m) => s + m.hedef, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KULLANICILAR EKRANI */}
        {screen === "kullanicilar" && isAdmin && (
          <div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>➕ Yeni Kullanıcı Ekle</div>
              <div style={styles.grid2}>
                <div><label style={styles.label}>Kullanıcı Adı</label><input style={styles.input} placeholder="kullanici" value={yeniKullanici.username} onChange={e => setYeniKullanici(p => ({ ...p, username: e.target.value }))} /></div>
                <div><label style={styles.label}>Şifre</label><input style={styles.input} placeholder="sifre123" value={yeniKullanici.password} onChange={e => setYeniKullanici(p => ({ ...p, password: e.target.value }))} /></div>
              </div>
              <div style={{ marginBottom: 16 }}><label style={styles.label}>Görünen İsim</label><input style={styles.input} placeholder="Adı Soyadı" value={yeniKullanici.display_name} onChange={e => setYeniKullanici(p => ({ ...p, display_name: e.target.value }))} /></div>
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>Rol</label>
                  <select style={styles.input} value={yeniKullanici.rol} onChange={e => setYeniKullanici(p => ({ ...p, rol: e.target.value }))}>
                    <option value="uye">Üye</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {yeniKullanici.rol === "uye" && (
                  <div>
                    <label style={styles.label}>Eşleşen İsim</label>
                    <select style={styles.input} value={yeniKullanici.isim_soyisim} onChange={e => setYeniKullanici(p => ({ ...p, isim_soyisim: e.target.value }))}>
                      <option value="">Seçiniz</option>
                      {Object.entries(KAT_LABELS).map(([key, val]) => (
                        <optgroup key={key} label={`${val.icon} ${val.label}`}>
                          {kisilerByKategori(key).map(k => <option key={k.id} value={k.isim_soyisim}>{k.isim_soyisim}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {kullaniciMesaj && <div style={{ ...styles.msg, marginTop: 12, background: kullaniciMesaj.startsWith("✅") ? "#e8f5e9" : "#fdecea", color: kullaniciMesaj.startsWith("✅") ? "#2e7d32" : "#c0392b" }}>{kullaniciMesaj}</div>}
              <button style={{ ...styles.btn, width: "100%", marginTop: 12 }} onClick={kullaniciEkle}>👤 Kullanıcı Ekle</button>
            </div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>📋 Mevcut Kullanıcılar ({kullanicilar.length})</div>
              {kullanicilar.map(k => (
                <div key={k.id} style={styles.userRow}>
                  <div><div style={{ fontWeight: 600, fontSize: 14 }}>{k.display_name}</div><div style={{ fontSize: 12, color: "#888" }}>@{k.username}</div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ ...styles.badge, background: k.rol === "admin" ? "#1A2942" : "#F4A620", color: k.rol === "admin" ? "#fff" : "#1A2942" }}>{k.rol === "admin" ? "Admin" : "Üye"}</span>
                    {k.username !== "admin" && <button style={{ fontSize: 16, background: "transparent", border: "none", cursor: "pointer" }} onClick={() => kullaniciSil(k.id)}>🗑️</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* KİŞİ EKLEME MODAL */}
      {kisiModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>➕ Yeni Kişi</div>
              <button style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer" }} onClick={() => setKisiModal(false)}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}><label style={styles.label}>İsim Soyisim *</label><input style={styles.input} value={yeniKisi.isim_soyisim} onChange={e => setYeniKisi(p => ({ ...p, isim_soyisim: e.target.value.toUpperCase() }))} /></div>
            <div style={{ marginBottom: 16 }}><label style={styles.label}>Kategori</label>
              <select style={styles.input} value={yeniKisi.kategori} onChange={e => setYeniKisi(p => ({ ...p, kategori: e.target.value }))}>
                {Object.entries(KAT_LABELS).map(([key, val]) => <option key={key} value={key}>{val.icon} {val.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}><label style={styles.label}>Mahalle</label>
              <select style={styles.input} value={yeniKisi.mahalle} onChange={e => setYeniKisi(p => ({ ...p, mahalle: e.target.value }))}>
                <option value="">-- Seçiniz --</option>
                {getMahalleler().map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={styles.grid2}>
              <div><label style={styles.label}>Görev</label><input style={styles.input} value={yeniKisi.gorev} onChange={e => setYeniKisi(p => ({ ...p, gorev: e.target.value }))} /></div>
              <div><label style={styles.label}>Hedef</label><input style={styles.input} type="number" value={yeniKisi.hedef} onChange={e => setYeniKisi(p => ({ ...p, hedef: e.target.value }))} /></div>
            </div>
            {kisiMesaj && <div style={{ ...styles.msg, marginTop: 12, background: kisiMesaj.startsWith("✅") ? "#e8f5e9" : "#fdecea", color: kisiMesaj.startsWith("✅") ? "#2e7d32" : "#c0392b" }}>{kisiMesaj}</div>}
            <button style={{ ...styles.btn, width: "100%", marginTop: 16 }} onClick={kisiEkle}>Ekle</button>
          </div>
        </div>
      )}
    </div>
  );
}
