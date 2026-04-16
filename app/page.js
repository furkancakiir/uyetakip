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
  { key: "teslim_edilen", label: "Teslim", short: "Teslim" },
  { key: "toplam_yapilabilir", label: "Yapılabilir", short: "Yapı." },
  { key: "yeni_uye", label: "Yeni Üye", short: "Yeni" },
  { key: "silinmis_uye", label: "Silinmiş", short: "Sil." },
  { key: "secmen_olmayan", label: "Seçmen Dışı", short: "Seç." },
  { key: "il_ilce_disi", label: "İl/İlçe Dışı", short: "İl/İlçe" },
  { key: "mukerrer", label: "Mükerrer", short: "Mük." },
  { key: "baska_parti_uyesi", label: "B.Parti", short: "B.P." },
  { key: "tc_seri_no_hatali", label: "TC Hatalı", short: "Hatalı" },
  { key: "imzasiz", label: "İmzasız", short: "İmz." },
];

const KAT_LABELS = {
  ilce_yonetimi: { label: "İlçe Yönetimi", short: "İlçe", icon: "🏛️" },
  mahalle: { label: "Mahalle Başkanları", short: "Mahalle", icon: "🏘️" },
  uye_dostlari: { label: "Üye Dostları", short: "Dostlar", icon: "💪" },
  belediye_meclis: { label: "Belediye Meclis", short: "Meclis", icon: "🏢" },
};

export default function App() {
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
  function kisilerByKategori(kat) { return kisiler.filter(k => k.kategori === kat); }

  async function giris() {
    setLoginHata("");
    const { data, error } = await supabase.from("kullanicilar").select("*")
      .eq("username", loginForm.username.toLowerCase().trim()).eq("password", loginForm.password).eq("is_active", true).single();
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
    if (!yeniKullanici.username || !yeniKullanici.password || !yeniKullanici.display_name) { setKullaniciMesaj("❌ Tüm alanları doldurun"); return; }
    if (yeniKullanici.rol === "uye" && !yeniKullanici.isim_soyisim) { setKullaniciMesaj("❌ Üye için isim seçin"); return; }
    const { error } = await supabase.from("kullanicilar").insert([{ username: yeniKullanici.username.toLowerCase().trim(), password: yeniKullanici.password, display_name: yeniKullanici.display_name, rol: yeniKullanici.rol, isim_soyisim: yeniKullanici.rol === "uye" ? yeniKullanici.isim_soyisim : null }]);
    if (error) { setKullaniciMesaj("❌ " + (error.message.includes("duplicate") ? "Bu kullanıcı adı zaten var" : error.message)); return; }
    setKullaniciMesaj("✅ Eklendi!");
    setYeniKullanici({ username: "", password: "", display_name: "", rol: "uye", isim_soyisim: "" });
    kullanicilariYukle();
  }

  async function kullaniciSil(id) { await supabase.from("kullanicilar").delete().eq("id", id); kullanicilariYukle(); }

  async function kaydet() {
    if (!form.isim_soyisim) { setMesaj("❌ İsim soyisim zorunlu"); return; }
    setYukleniyor(true);
    const kayit = {};
    Object.keys(BOSH_FORM).forEach(k => {
      if (ALANLAR.find(a => a.key === k)) kayit[k] = form[k] === "" ? 0 : parseInt(form[k]) || 0;
      else kayit[k] = form[k] || null;
    });
    kayit.olusturan = kullanici?.display_name;
    const { error } = await supabase.from("tutanak_kayitlari").insert([kayit]);
    setYukleniyor(false);
    if (error) { setMesaj("❌ " + error.message); return; }
    setMesaj("✅ Kaydedildi!");
    setForm({ ...BOSH_FORM, tutanak_tarih: form.tutanak_tarih });
    yukle(kullanici);
  }

  async function sil(id) { await supabase.from("tutanak_kayitlari").delete().eq("id", id); setSilOnay(null); yukle(kullanici); }

  function cikis() { localStorage.removeItem("tutanak_auth"); setKullanici(null); setKayitlar([]); setScreen("login"); }

  const isAdmin = kullanici?.rol === "admin";
  const filtreliKategori = isAdmin ? kayitlar.filter(k => kisilerByKategori(aktifKategori).some(p => p.isim_soyisim === k.isim_soyisim)).filter(k => !filtre || k.isim_soyisim.toLowerCase().includes(filtre.toLowerCase())) : kayitlar;
  
  const kisiOzeti = kisilerByKategori(aktifKategori).map(kisi => {
    const kisiKayitlari = kayitlar.filter(k => k.isim_soyisim === kisi.isim_soyisim);
    return { isim: kisi.isim_soyisim, kayit: kisiKayitlari.length, teslim: kisiKayitlari.reduce((s, k) => s + (k.teslim_edilen || 0), 0), yeni: kisiKayitlari.reduce((s, k) => s + (k.yeni_uye || 0), 0), muk: kisiKayitlari.reduce((s, k) => s + (k.mukerrer || 0), 0), hatali: kisiKayitlari.reduce((s, k) => s + (k.tc_seri_no_hatali || 0), 0) };
  }).filter(k => !filtre || k.isim.toLowerCase().includes(filtre.toLowerCase())).sort((a, b) => b.yeni - a.yeni);

  const S = {
    container: { minHeight: "100vh", background: "#F0F2F5", fontFamily: "-apple-system, sans-serif", paddingBottom: 80 },
    loginWrap: { minHeight: "100vh", background: "#1A2942", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
    loginBox: { background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 320 },
    header: { background: "#1A2942", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 },
    bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#1A2942", display: "flex", justifyContent: "space-around", padding: "10px 0", zIndex: 100 },
    navBtn: { background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" },
    content: { padding: 12, maxWidth: 500, margin: "0 auto" },
    card: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
    cardTitle: { fontSize: 15, fontWeight: 700, color: "#1A2942", marginBottom: 14, borderBottom: "2px solid #F4A620", paddingBottom: 8 },
    label: { display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 },
    input: { width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: 10, fontSize: 16, boxSizing: "border-box" },
    btn: { width: "100%", padding: 14, background: "#1A2942", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer" },
    tabsRow: { display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 },
    tab: { padding: "10px 12px", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
    summaryRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 },
    summaryCard: { background: "#fff", borderRadius: 10, padding: 12, textAlign: "center" },
    summaryVal: { fontSize: 20, fontWeight: 700, color: "#1A2942" },
    summaryLbl: { fontSize: 10, color: "#888" },
    personCard: { background: "#fff", borderRadius: 10, padding: 14, marginBottom: 8, cursor: "pointer" },
    recordCard: { background: "#fff", borderRadius: 10, padding: 14, marginBottom: 8 },
    totalBar: { background: "#1A2942", color: "#fff", borderRadius: 10, padding: 14, marginTop: 8 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
    grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
    msg: { padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 },
    userRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #eee" },
    badge: { padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700 },
  };

  if (screen === "login") return (
    <div style={S.loginWrap}>
      <div style={S.loginBox}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "#F4A620", fontWeight: 700 }}>BİLGİ VE İLETİŞİM TEKNOLOJİLERİ</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1A2942" }}>Üye Takip Sistemi</div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={S.label}>Kullanıcı Adı</label><input style={S.input} value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} onKeyDown={e => e.key === "Enter" && giris()} /></div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Şifre</label><input style={S.input} type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && giris()} /></div>
        {loginHata && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{loginHata}</div>}
        <button style={S.btn} onClick={giris}>Giriş Yap</button>
      </div>
    </div>
  );

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div><div style={{ color: "#F4A620", fontWeight: 700, fontSize: 10 }}>BİLGİ VE İLETİŞİM TEKNOLOJİLERİ</div><div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Üye Takip</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#8A9BB5", fontSize: 11 }}>{kullanici?.display_name?.split(" ")[0]}</span>
          <button style={{ padding: "6px 12px", background: "transparent", color: "#c0392b", border: "1px solid #c0392b", borderRadius: 6, fontSize: 12 }} onClick={cikis}>Çıkış</button>
        </div>
      </div>

      {isAdmin && (
        <div style={S.bottomNav}>
          <button style={{ ...S.navBtn, color: screen === "form" ? "#F4A620" : "#8A9BB5" }} onClick={() => setScreen("form")}><span style={{ fontSize: 20 }}>📝</span><span style={{ fontSize: 10 }}>Kayıt</span></button>
          <button style={{ ...S.navBtn, color: screen === "liste" ? "#F4A620" : "#8A9BB5" }} onClick={() => { setScreen("liste"); yukle(kullanici); }}><span style={{ fontSize: 20 }}>📊</span><span style={{ fontSize: 10 }}>Liste</span></button>
          <button style={{ ...S.navBtn, color: screen === "rapor" ? "#F4A620" : "#8A9BB5" }} onClick={() => { setScreen("rapor"); yukle(kullanici); }}><span style={{ fontSize: 20 }}>📈</span><span style={{ fontSize: 10 }}>Rapor</span></button>
          <button style={{ ...S.navBtn, color: screen === "kullanicilar" ? "#F4A620" : "#8A9BB5" }} onClick={() => { setScreen("kullanicilar"); kullanicilariYukle(); }}><span style={{ fontSize: 20 }}>👥</span><span style={{ fontSize: 10 }}>Kullanıcı</span></button>
        </div>
      )}

      <div style={S.content}>
        {!isAdmin && hataliUyari > 0 && <div style={{ background: "#FFF3CD", border: "1px solid #FFCA28", borderRadius: 10, padding: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 24 }}>⚠️</span><div><div style={{ fontWeight: 700, color: "#856404", fontSize: 13 }}>Hatalı Kayıt</div><div style={{ fontSize: 12, color: "#856404" }}><strong>{hataliUyari}</strong> adet TC hatalı</div></div></div>}

        {screen === "form" && isAdmin && (
          <div style={S.card}>
            <div style={S.cardTitle}>📝 Yeni Tutanak</div>
            <div style={{ marginBottom: 12 }}><label style={S.label}>Tarih</label><input style={S.input} type="date" value={form.tutanak_tarih} onChange={e => setForm(p => ({ ...p, tutanak_tarih: e.target.value }))} /></div>
            <div style={{ marginBottom: 12 }}><label style={S.label}>Tutanak No</label><input style={S.input} placeholder="AK00001" value={form.tutanak_no} onChange={e => setForm(p => ({ ...p, tutanak_no: e.target.value }))} /></div>
            <div style={{ marginBottom: 12 }}><label style={S.label}>İsim Soyisim *</label><select style={S.input} value={form.isim_soyisim} onChange={e => setForm(p => ({ ...p, isim_soyisim: e.target.value }))}><option value="">-- Seçiniz --</option>{Object.entries(KAT_LABELS).map(([key, val]) => <optgroup key={key} label={`${val.icon} ${val.short}`}>{kisilerByKategori(key).map(k => <option key={k.id} value={k.isim_soyisim}>{k.isim_soyisim}</option>)}</optgroup>)}</select></div>
            <div style={S.grid2}>{ALANLAR.slice(0, 4).map(a => <div key={a.key}><label style={{ ...S.label, fontSize: 10 }}>{a.short}</label><input style={{ ...S.input, textAlign: "center" }} type="number" min="0" placeholder="0" value={form[a.key]} onChange={e => setForm(p => ({ ...p, [a.key]: e.target.value }))} /></div>)}</div>
            <div style={S.grid3}>{ALANLAR.slice(4).map(a => <div key={a.key}><label style={{ ...S.label, fontSize: 10 }}>{a.short}</label><input style={{ ...S.input, textAlign: "center", padding: 10, background: a.key === "tc_seri_no_hatali" ? "#FFF8E1" : "#fff" }} type="number" min="0" placeholder="0" value={form[a.key]} onChange={e => setForm(p => ({ ...p, [a.key]: e.target.value }))} /></div>)}</div>
            <div style={{ marginTop: 12, marginBottom: 12 }}><label style={S.label}>Notlar</label><input style={S.input} placeholder="Özel not..." value={form.notlar} onChange={e => setForm(p => ({ ...p, notlar: e.target.value }))} /></div>
            {mesaj && <div style={{ ...S.msg, background: mesaj.startsWith("✅") ? "#e8f5e9" : "#fdecea", color: mesaj.startsWith("✅") ? "#2e7d32" : "#c0392b" }}>{mesaj}</div>}
            <div style={{ display: "flex", gap: 10 }}><button style={{ ...S.btn, flex: 1 }} onClick={kaydet} disabled={yukleniyor}>{yukleniyor ? "..." : "💾 Kaydet"}</button><button style={{ ...S.btn, background: "#e0e0e0", color: "#555", flex: 0.4 }} onClick={() => setForm(BOSH_FORM)}>Temizle</button></div>
          </div>
        )}

        {screen === "liste" && (
          <div>
            {isAdmin && <div style={S.tabsRow}>{Object.entries(KAT_LABELS).map(([key, val]) => <button key={key} onClick={() => setAktifKategori(key)} style={{ ...S.tab, background: aktifKategori === key ? "#1A2942" : "#fff", color: aktifKategori === key ? "#fff" : "#555" }}>{val.icon} {val.short}</button>)}</div>}
            {isAdmin && <div style={{ display: "flex", gap: 6, marginBottom: 12 }}><button onClick={() => setGorunumModu("kisiler")} style={{ ...S.tab, background: gorunumModu === "kisiler" ? "#2e7d32" : "#e0e0e0", color: gorunumModu === "kisiler" ? "#fff" : "#555" }}>👥 Kişiler</button><button onClick={() => setGorunumModu("kayitlar")} style={{ ...S.tab, background: gorunumModu === "kayitlar" ? "#2e7d32" : "#e0e0e0", color: gorunumModu === "kayitlar" ? "#fff" : "#555" }}>📋 Kayıtlar</button></div>}
            <input style={{ ...S.input, marginBottom: 12 }} placeholder="🔍 İsim ara..." value={filtre} onChange={e => setFiltre(e.target.value)} />

            {!isAdmin && <div style={S.summaryRow}><div style={S.summaryCard}><div style={S.summaryVal}>{kayitlar.reduce((s, k) => s + (k.teslim_edilen || 0), 0)}</div><div style={S.summaryLbl}>Teslim</div></div><div style={S.summaryCard}><div style={{ ...S.summaryVal, color: "#2e7d32" }}>{kayitlar.reduce((s, k) => s + (k.yeni_uye || 0), 0)}</div><div style={S.summaryLbl}>Yeni</div></div><div style={S.summaryCard}><div style={{ ...S.summaryVal, color: "#c0392b" }}>{kayitlar.reduce((s, k) => s + (k.mukerrer || 0), 0)}</div><div style={S.summaryLbl}>Mük.</div></div><div style={S.summaryCard}><div style={{ ...S.summaryVal, color: "#FF8F00" }}>{hataliUyari}</div><div style={S.summaryLbl}>Hatalı</div></div></div>}

            {isAdmin && gorunumModu === "kisiler" && <div>{kisiOzeti.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#999" }}>Kişi yok</div>}{kisiOzeti.map(k => <div key={k.isim} style={{ ...S.personCard, background: k.kayit === 0 ? "#FFF8E1" : "#fff" }} onClick={() => setSeciliKisi(seciliKisi === k.isim ? null : k.isim)}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontWeight: 600, fontSize: 14 }}>{k.isim}</div>{k.kayit === 0 && <span style={{ fontSize: 10, color: "#FF8F00" }}>⚠️ Kayıt yok</span>}</div><div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 700, color: "#2e7d32" }}>{k.yeni}</div><div style={{ fontSize: 9, color: "#888" }}>Yeni Üye</div></div></div>{seciliKisi === k.isim && <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}><div>Kayıt: <strong>{k.kayit}</strong></div><div>Teslim: <strong>{k.teslim}</strong></div><div>Mükerrer: <strong style={{ color: k.muk > 0 ? "#c0392b" : "inherit" }}>{k.muk}</strong></div><div>Hatalı: <strong style={{ color: k.hatali > 0 ? "#FF8F00" : "inherit" }}>{k.hatali}</strong></div></div>}</div>)}{kisiOzeti.length > 0 && <div style={S.totalBar}><div style={{ fontWeight: 700, fontSize: 13 }}>TOPLAM ({kisiOzeti.length} kişi)</div><div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 12, flexWrap: "wrap" }}><span>Teslim: <strong>{kisiOzeti.reduce((s, k) => s + k.teslim, 0)}</strong></span><span style={{ color: "#F4A620" }}>Yeni: <strong>{kisiOzeti.reduce((s, k) => s + k.yeni, 0)}</strong></span><span>Mük: <strong>{kisiOzeti.reduce((s, k) => s + k.muk, 0)}</strong></span></div></div>}</div>}

            {(gorunumModu === "kayitlar" || !isAdmin) && <div>{filtreliKategori.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#999" }}>Kayıt yok</div>}{filtreliKategori.map(k => <div key={k.id} style={S.recordCard}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><div><div style={{ fontWeight: 600, fontSize: 13 }}>{k.isim_soyisim}</div><div style={{ fontSize: 11, color: "#888" }}>{k.tutanak_tarih} {k.tutanak_no && `• ${k.tutanak_no}`}</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 18, fontWeight: 700, color: "#2e7d32" }}>{k.yeni_uye}</div><div style={{ fontSize: 9, color: "#888" }}>Yeni</div></div></div><div style={{ display: "flex", gap: 10, fontSize: 12, color: "#666", flexWrap: "wrap" }}><span>Teslim: <strong>{k.teslim_edilen}</strong></span>{k.mukerrer > 0 && <span style={{ color: "#c0392b" }}>Mük: <strong>{k.mukerrer}</strong></span>}{k.tc_seri_no_hatali > 0 && <span style={{ color: "#FF8F00", background: "#FFF8E1", padding: "1px 4px", borderRadius: 3 }}>Hatalı: <strong>{k.tc_seri_no_hatali}</strong></span>}</div>{isAdmin && <div style={{ marginTop: 8, textAlign: "right" }}>{silOnay === k.id ? <span><button style={{ fontSize: 12, background: "#c0392b", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", marginRight: 6 }} onClick={() => sil(k.id)}>Sil</button><button style={{ fontSize: 12, background: "#ccc", border: "none", borderRadius: 4, padding: "4px 10px" }} onClick={() => setSilOnay(null)}>İptal</button></span> : <button style={{ fontSize: 14, background: "transparent", border: "none" }} onClick={() => setSilOnay(k.id)}>🗑️</button>}</div>}</div>)}</div>}
          </div>
        )}

        {screen === "rapor" && isAdmin && <div style={S.card}><div style={S.cardTitle}>📈 Rapor</div><div style={S.summaryRow}><div style={S.summaryCard}><div style={S.summaryVal}>{kayitlar.reduce((s, k) => s + (k.teslim_edilen || 0), 0)}</div><div style={S.summaryLbl}>Teslim</div></div><div style={S.summaryCard}><div style={{ ...S.summaryVal, color: "#2e7d32" }}>{kayitlar.reduce((s, k) => s + (k.yeni_uye || 0), 0)}</div><div style={S.summaryLbl}>Yeni Üye</div></div><div style={S.summaryCard}><div style={{ ...S.summaryVal, color: "#c0392b" }}>{kayitlar.reduce((s, k) => s + (k.mukerrer || 0), 0)}</div><div style={S.summaryLbl}>Mükerrer</div></div><div style={S.summaryCard}><div style={{ ...S.summaryVal, color: "#FF8F00" }}>{kayitlar.reduce((s, k) => s + (k.tc_seri_no_hatali || 0), 0)}</div><div style={S.summaryLbl}>Hatalı</div></div></div><div style={{ marginTop: 16 }}><div style={{ fontWeight: 700, marginBottom: 12 }}>Kategori Özeti</div>{Object.entries(KAT_LABELS).map(([key, val]) => { const katYeni = kayitlar.filter(k => kisilerByKategori(key).some(p => p.isim_soyisim === k.isim_soyisim)).reduce((s, k) => s + (k.yeni_uye || 0), 0); return <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee", fontSize: 13 }}><span>{val.icon} {val.short}</span><strong style={{ color: "#2e7d32" }}>{katYeni} yeni</strong></div>; })}</div></div>}

        {screen === "kullanicilar" && isAdmin && <div><div style={S.card}><div style={S.cardTitle}>➕ Yeni Kullanıcı</div><div style={S.grid2}><div><label style={S.label}>Kullanıcı Adı</label><input style={S.input} value={yeniKullanici.username} onChange={e => setYeniKullanici(p => ({ ...p, username: e.target.value }))} /></div><div><label style={S.label}>Şifre</label><input style={S.input} value={yeniKullanici.password} onChange={e => setYeniKullanici(p => ({ ...p, password: e.target.value }))} /></div></div><div style={{ marginBottom: 12 }}><label style={S.label}>Görünen İsim</label><input style={S.input} value={yeniKullanici.display_name} onChange={e => setYeniKullanici(p => ({ ...p, display_name: e.target.value }))} /></div><div style={S.grid2}><div><label style={S.label}>Rol</label><select style={S.input} value={yeniKullanici.rol} onChange={e => setYeniKullanici(p => ({ ...p, rol: e.target.value }))}><option value="uye">Üye</option><option value="admin">Admin</option></select></div>{yeniKullanici.rol === "uye" && <div><label style={S.label}>Eşleşen İsim</label><select style={S.input} value={yeniKullanici.isim_soyisim} onChange={e => setYeniKullanici(p => ({ ...p, isim_soyisim: e.target.value }))}><option value="">Seçiniz</option>{kisiler.map(k => <option key={k.id} value={k.isim_soyisim}>{k.isim_soyisim}</option>)}</select></div>}</div>{kullaniciMesaj && <div style={{ ...S.msg, marginTop: 12, background: kullaniciMesaj.startsWith("✅") ? "#e8f5e9" : "#fdecea", color: kullaniciMesaj.startsWith("✅") ? "#2e7d32" : "#c0392b" }}>{kullaniciMesaj}</div>}<button style={{ ...S.btn, marginTop: 12 }} onClick={kullaniciEkle}>👤 Ekle</button></div><div style={S.card}><div style={S.cardTitle}>📋 Kullanıcılar ({kullanicilar.length})</div>{kullanicilar.map(k => <div key={k.id} style={S.userRow}><div><div style={{ fontWeight: 600, fontSize: 13 }}>{k.display_name}</div><div style={{ fontSize: 11, color: "#888" }}>@{k.username}</div></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ ...S.badge, background: k.rol === "admin" ? "#1A2942" : "#F4A620", color: k.rol === "admin" ? "#fff" : "#1A2942" }}>{k.rol === "admin" ? "Admin" : "Üye"}</span>{k.username !== "admin" && <button style={{ fontSize: 14, background: "transparent", border: "none" }} onClick={() => kullaniciSil(k.id)}>🗑️</button>}</div></div>)}</div></div>}
      </div>
    </div>
  );
}
