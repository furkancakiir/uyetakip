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
  { key: "teslim_edilen", label: "Teslim Edilen" },
  { key: "toplam_yapilabilir", label: "Toplam Yapılabilir" },
  { key: "yeni_uye", label: "Yeni Üye" },
  { key: "silinmis_uye", label: "Silinmiş Üye" },
  { key: "secmen_olmayan", label: "Seçmen Olmayan" },
  { key: "il_ilce_disi", label: "İl/İlçe Dışı" },
  { key: "mukerrer", label: "Mükerrer" },
  { key: "baska_parti_uyesi", label: "Başka Parti Üyesi" },
  { key: "tc_seri_no_hatali", label: "TC/Seri No Hatalı" },
  { key: "imzasiz", label: "İmzasız" },
];

const KAT_LABELS = {
  ilce_yonetimi: { label: "İlçe Yönetimi", icon: "🏛️" },
  mahalle: { label: "Mahalle Başkanları", icon: "🏘️" },
  uye_dostlari: { label: "Üye Dostları", icon: "💪" },
  belediye_meclis: { label: "Belediye Meclis Üyeleri", icon: "🏢" },
};

function getHaftaBasi() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}
function getAyBasi() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

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
  const [raporTur, setRaporTur] = useState("haftalik");
  const [raporBaslangic, setRaporBaslangic] = useState(getHaftaBasi());
  const [raporBitis, setRaporBitis] = useState(new Date().toISOString().split("T")[0]);
  const [gorunumModu, setGorunumModu] = useState("kisiler"); // "kisiler" veya "kayitlar"

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

  useEffect(() => {
    if (raporTur === "haftalik") {
      setRaporBaslangic(getHaftaBasi());
      setRaporBitis(new Date().toISOString().split("T")[0]);
    } else if (raporTur === "aylik") {
      setRaporBaslangic(getAyBasi());
      setRaporBitis(new Date().toISOString().split("T")[0]);
    }
  }, [raporTur]);

  async function kisileriYukle() {
    const { data } = await supabase.from("kisiler").select("*").eq("is_active", true).order("isim_soyisim");
    if (data) setKisiler(data);
  }

  function kisilerByKategori(kat) {
    return kisiler.filter(k => k.kategori === kat);
  }

  async function giris() {
    setLoginHata("");
    const { data, error } = await supabase
      .from("kullanicilar")
      .select("*")
      .eq("username", loginForm.username.toLowerCase().trim())
      .eq("password", loginForm.password)
      .eq("is_active", true)
      .single();
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
      setKullaniciMesaj("❌ Üye için isim soyisim seçin"); return;
    }
    const { error } = await supabase.from("kullanicilar").insert([{
      username: yeniKullanici.username.toLowerCase().trim(),
      password: yeniKullanici.password,
      display_name: yeniKullanici.display_name,
      rol: yeniKullanici.rol,
      isim_soyisim: yeniKullanici.rol === "uye" ? yeniKullanici.isim_soyisim : null,
    }]);
    if (error) { setKullaniciMesaj("❌ " + (error.message.includes("duplicate") ? "Bu kullanıcı adı zaten var" : error.message)); return; }
    setKullaniciMesaj("✅ Kullanıcı eklendi!");
    setYeniKullanici({ username: "", password: "", display_name: "", rol: "uye", isim_soyisim: "" });
    kullanicilariYukle();
    setTimeout(() => setKullaniciMesaj(""), 3000);
  }

  async function kullaniciSil(id) {
    await supabase.from("kullanicilar").delete().eq("id", id);
    kullanicilariYukle();
  }

  async function kaydet() {
    if (!form.isim_soyisim) { setMesaj("❌ İsim soyisim zorunlu"); return; }
    if (!form.tutanak_tarih) { setMesaj("❌ Tarih zorunlu"); return; }
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
    setTimeout(() => setMesaj(""), 3000);
  }

  async function sil(id) {
    await supabase.from("tutanak_kayitlari").delete().eq("id", id);
    setSilOnay(null);
    yukle(kullanici);
  }

  function cikis() {
    localStorage.removeItem("tutanak_auth");
    setKullanici(null); setKayitlar([]); setHataliUyari(0);
    setScreen("login"); setLoginForm({ username: "", password: "" });
  }

  function excelExport(rows, filename) {
    const baslik = ["Tarih","Tutanak No","İsim Soyisim","Teslim Edilen","Toplam Yapılabilir","Yeni Üye","Silinmiş Üye","Seçmen Olmayan","İl/İlçe Dışı","Mükerrer","Başka Parti Üyesi","TC/Seri No Hatalı","İmzasız","Notlar"];
    const satirlar = rows.map(k => [k.tutanak_tarih, k.tutanak_no||"", k.isim_soyisim, k.teslim_edilen, k.toplam_yapilabilir, k.yeni_uye, k.silinmis_uye, k.secmen_olmayan, k.il_ilce_disi, k.mukerrer, k.baska_parti_uyesi, k.tc_seri_no_hatali, k.imzasiz, k.notlar||""]);
    const csv = [baslik,...satirlar].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8;"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = filename; a.click();
  }

  function excelExportKisiOzet(rows, filename) {
    const baslik = ["İsim Soyisim","Kayıt Sayısı","Teslim Edilen","Toplam Yapılabilir","Yeni Üye","Silinmiş Üye","Seçmen Olmayan","İl/İlçe Dışı","Mükerrer","Başka Parti Üyesi","TC/Seri No Hatalı","İmzasız"];
    const satirlar = rows.map(k => [k.isim, k.kayit_sayisi, k.teslim, k.yapilabilir, k.yeni_uye, k.silinmis, k.secmen, k.il_ilce, k.mukerrer, k.baska_parti, k.hatali, k.imzasiz]);
    const csv = [baslik,...satirlar].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8;"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = filename; a.click();
  }

  const filtreli = kayitlar.filter(k =>
    !filtre || k.isim_soyisim.toLowerCase().includes(filtre.toLowerCase()) ||
    (k.tutanak_no||"").toLowerCase().includes(filtre.toLowerCase())
  );

  const isAdmin = kullanici?.rol === "admin";

  const filtreliKategori = isAdmin
    ? filtreli.filter(k => kisilerByKategori(aktifKategori).some(p => p.isim_soyisim === k.isim_soyisim))
    : filtreli;

  // Kişi bazlı özet (tüm kişiler - kayıt olmayanlar dahil)
  const kisiOzetByKategori = () => {
    const katKisiler = kisilerByKategori(aktifKategori);
    return katKisiler.map(kisi => {
      const kisiKayitlari = kayitlar.filter(k => k.isim_soyisim === kisi.isim_soyisim);
      return {
        isim: kisi.isim_soyisim,
        kayit_sayisi: kisiKayitlari.length,
        teslim: kisiKayitlari.reduce((s, k) => s + (k.teslim_edilen || 0), 0),
        yapilabilir: kisiKayitlari.reduce((s, k) => s + (k.toplam_yapilabilir || 0), 0),
        yeni_uye: kisiKayitlari.reduce((s, k) => s + (k.yeni_uye || 0), 0),
        silinmis: kisiKayitlari.reduce((s, k) => s + (k.silinmis_uye || 0), 0),
        secmen: kisiKayitlari.reduce((s, k) => s + (k.secmen_olmayan || 0), 0),
        il_ilce: kisiKayitlari.reduce((s, k) => s + (k.il_ilce_disi || 0), 0),
        mukerrer: kisiKayitlari.reduce((s, k) => s + (k.mukerrer || 0), 0),
        baska_parti: kisiKayitlari.reduce((s, k) => s + (k.baska_parti_uyesi || 0), 0),
        hatali: kisiKayitlari.reduce((s, k) => s + (k.tc_seri_no_hatali || 0), 0),
        imzasiz: kisiKayitlari.reduce((s, k) => s + (k.imzasiz || 0), 0),
      };
    }).filter(k => !filtre || k.isim.toLowerCase().includes(filtre.toLowerCase()))
      .sort((a, b) => b.yeni_uye - a.yeni_uye);
  };

  const kisiOzeti = kisiOzetByKategori();

  const raporKayitlari = kayitlar.filter(k => k.tutanak_tarih >= raporBaslangic && k.tutanak_tarih <= raporBitis);

  const kisiOzet = {};
  raporKayitlari.forEach(k => {
    if (!kisiOzet[k.isim_soyisim]) {
      kisiOzet[k.isim_soyisim] = { isim: k.isim_soyisim, teslim: 0, yapilabilir: 0, yeni_uye: 0, mukerrer: 0, hatali: 0, kayit_sayisi: 0 };
    }
    kisiOzet[k.isim_soyisim].teslim += k.teslim_edilen || 0;
    kisiOzet[k.isim_soyisim].yapilabilir += k.toplam_yapilabilir || 0;
    kisiOzet[k.isim_soyisim].yeni_uye += k.yeni_uye || 0;
    kisiOzet[k.isim_soyisim].mukerrer += k.mukerrer || 0;
    kisiOzet[k.isim_soyisim].hatali += k.tc_seri_no_hatali || 0;
    kisiOzet[k.isim_soyisim].kayit_sayisi += 1;
  });
  const kisiSirali = Object.values(kisiOzet).sort((a, b) => b.yeni_uye - a.yeni_uye);

  const kategoriOzet = {};
  Object.keys(KAT_LABELS).forEach(kat => {
    const katKisiler = kisilerByKategori(kat).map(k => k.isim_soyisim);
    const katKayitlar = raporKayitlari.filter(k => katKisiler.includes(k.isim_soyisim));
    kategoriOzet[kat] = {
      teslim: katKayitlar.reduce((s, k) => s + (k.teslim_edilen || 0), 0),
      yeni_uye: katKayitlar.reduce((s, k) => s + (k.yeni_uye || 0), 0),
      mukerrer: katKayitlar.reduce((s, k) => s + (k.mukerrer || 0), 0),
      hatali: katKayitlar.reduce((s, k) => s + (k.tc_seri_no_hatali || 0), 0),
      kisi_sayisi: new Set(katKayitlar.map(k => k.isim_soyisim)).size,
    };
  });

  const genelToplam = {
    teslim: raporKayitlari.reduce((s, k) => s + (k.teslim_edilen || 0), 0),
    yapilabilir: raporKayitlari.reduce((s, k) => s + (k.toplam_yapilabilir || 0), 0),
    yeni_uye: raporKayitlari.reduce((s, k) => s + (k.yeni_uye || 0), 0),
    mukerrer: raporKayitlari.reduce((s, k) => s + (k.mukerrer || 0), 0),
    hatali: raporKayitlari.reduce((s, k) => s + (k.tc_seri_no_hatali || 0), 0),
  };

  if (screen === "login") return (
    <div style={{minHeight:"100vh",background:"#1A2942",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Calibri,sans-serif"}}>
      <div style={{background:"#fff",borderRadius:12,padding:"40px 36px",width:360,boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:12,color:"#F4A620",fontWeight:700,letterSpacing:1,marginBottom:6}}>BİLGİ VE İLETİŞİM TEKNOLOJİLERİ</div>
          <div style={{fontSize:20,fontWeight:700,color:"#1A2942"}}>Tutanak Takip Sistemi</div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={lbl}>Kullanıcı Adı</label>
          <input style={inp} autoFocus value={loginForm.username}
            onChange={e=>setLoginForm(p=>({...p,username:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&giris()} />
        </div>
        <div style={{marginBottom:20}}>
          <label style={lbl}>Şifre</label>
          <input style={inp} type="password" value={loginForm.password}
            onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&giris()} />
        </div>
        {loginHata && <div style={{color:"#c0392b",fontSize:13,marginBottom:12,textAlign:"center"}}>{loginHata}</div>}
        <button style={btnPrimary} onClick={giris}>Giriş Yap</button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F0F2F5",fontFamily:"Calibri,sans-serif"}}>
      <div style={{background:"#1A2942",padding:"12px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <span style={{color:"#F4A620",fontWeight:700,fontSize:12}}>BİLGİ VE İLETİŞİM TEKNOLOJİLERİ</span>
          <span style={{color:"#fff",fontWeight:700,fontSize:16,marginLeft:10}}>Tutanak Takip Sistemi</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{color:"#8A9BB5",fontSize:12}}>
            {kullanici?.display_name}
            {!isAdmin && <span style={{marginLeft:6,background:"#F4A620",color:"#1A2942",borderRadius:4,padding:"1px 6px",fontSize:11,fontWeight:700}}>Üye</span>}
          </span>
          {isAdmin && <>
            <button style={{...btnSec, background:screen==="form"?"#F4A620":"transparent", color:screen==="form"?"#1A2942":"#8A9BB5"}} onClick={()=>setScreen("form")}>📋 Yeni Kayıt</button>
            <button style={{...btnSec, background:screen==="liste"?"#F4A620":"transparent", color:screen==="liste"?"#1A2942":"#8A9BB5"}} onClick={()=>{setScreen("liste");yukle(kullanici);}}>📊 Kayıtlar</button>
            <button style={{...btnSec, background:screen==="rapor"?"#F4A620":"transparent", color:screen==="rapor"?"#1A2942":"#8A9BB5"}} onClick={()=>{setScreen("rapor");yukle(kullanici);}}>📈 Raporlar</button>
            <button style={{...btnSec, background:screen==="kullanicilar"?"#F4A620":"transparent", color:screen==="kullanicilar"?"#1A2942":"#8A9BB5"}} onClick={()=>{setScreen("kullanicilar");kullanicilariYukle();}}>👥 Kullanıcılar</button>
          </>}
          {!isAdmin && <button style={{...btnSec, background:"#F4A620", color:"#1A2942"}}>📊 Kayıtlarım ({kayitlar.length})</button>}
          <button style={{...btnSec,color:"#c0392b"}} onClick={cikis}>Çıkış</button>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 16px"}}>

        {!isAdmin && hataliUyari > 0 && (
          <div style={{background:"#FFF3CD",border:"1px solid #FFCA28",borderRadius:10,padding:"14px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:28}}>⚠️</span>
            <div>
              <div style={{fontWeight:700,color:"#856404",fontSize:14}}>Hatalı Kayıt Bildirimi</div>
              <div style={{fontSize:13,color:"#856404"}}><strong>{hataliUyari}</strong> adet TC/Seri No hatalı formunuz geri iade edilmiştir.</div>
            </div>
          </div>
        )}

        {screen==="form" && isAdmin && (
          <div style={{background:"#fff",borderRadius:10,padding:28,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:17,fontWeight:700,color:"#1A2942",marginBottom:20,borderBottom:"2px solid #F4A620",paddingBottom:10}}>Yeni Tutanak Girişi</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 2fr",gap:14,marginBottom:18}}>
              <div><label style={lbl}>Tutanak Tarihi *</label><input style={inp} type="date" value={form.tutanak_tarih} onChange={e=>setForm(p=>({...p,tutanak_tarih:e.target.value}))} /></div>
              <div><label style={lbl}>Tutanak No</label><input style={inp} placeholder="AK00001" value={form.tutanak_no} onChange={e=>setForm(p=>({...p,tutanak_no:e.target.value}))} /></div>
              <div><label style={lbl}>İsim Soyisim *</label>
                <select style={inp} value={form.isim_soyisim} onChange={e=>setForm(p=>({...p,isim_soyisim:e.target.value}))}>
                  <option value="">-- Seçiniz --</option>
                  {Object.entries(KAT_LABELS).map(([key, val]) => (
                    <optgroup key={key} label={`${val.icon} ${val.label}`}>
                      {kisilerByKategori(key).map(k=><option key={k.id} value={k.isim_soyisim}>{k.isim_soyisim}</option>)}
                    </optgroup>
                  ))}
                </select></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:18}}>
              {ALANLAR.map(a=>(
                <div key={a.key}>
                  <label style={{...lbl,fontSize:11}}>{a.label}</label>
                  <input style={{...inp,textAlign:"center",fontWeight:a.key==="teslim_edilen"||a.key==="yeni_uye"||a.key==="tc_seri_no_hatali"?700:400,background:a.key==="tc_seri_no_hatali"?"#FFF8E1":"#fff"}}
                    type="number" min="0" placeholder="0" value={form[a.key]} onChange={e=>setForm(p=>({...p,[a.key]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div style={{marginBottom:20}}><label style={lbl}>Notlar</label><input style={inp} placeholder="Özel not..." value={form.notlar} onChange={e=>setForm(p=>({...p,notlar:e.target.value}))} /></div>
            {mesaj && <div style={{marginBottom:14,padding:"10px 14px",background:mesaj.startsWith("✅")?"#e8f5e9":"#fdecea",borderRadius:6,fontSize:14,color:mesaj.startsWith("✅")?"#2e7d32":"#c0392b"}}>{mesaj}</div>}
            <div style={{display:"flex",gap:10}}>
              <button style={{...btnPrimary,width:"auto",padding:"10px 32px"}} onClick={kaydet} disabled={yukleniyor}>{yukleniyor?"Kaydediliyor...":"💾 Kaydet"}</button>
              <button style={{...btnPrimary,width:"auto",padding:"10px 20px",background:"#e0e0e0",color:"#555"}} onClick={()=>setForm(BOSH_FORM)}>Temizle</button>
            </div>
          </div>
        )}

        {screen==="liste" && (
          <div>
            {isAdmin && (
              <>
                <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                  {Object.entries(KAT_LABELS).map(([key, val])=>{
                    const katKisiSayisi = kisilerByKategori(key).length;
                    return (
                      <button key={key} onClick={()=>setAktifKategori(key)}
                        style={{padding:"10px 18px",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",
                          background:aktifKategori===key?"#1A2942":"#fff",color:aktifKategori===key?"#fff":"#555",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
                        {val.icon} {val.label} <span style={{marginLeft:6,padding:"2px 8px",borderRadius:10,fontSize:11,background:aktifKategori===key?"#F4A620":"#eee",color:aktifKategori===key?"#1A2942":"#666"}}>{katKisiSayisi}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{display:"flex",gap:8,marginBottom:18}}>
                  <button onClick={()=>setGorunumModu("kisiler")} style={{padding:"8px 16px",border:"none",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",background:gorunumModu==="kisiler"?"#2e7d32":"#e0e0e0",color:gorunumModu==="kisiler"?"#fff":"#555"}}>👥 Kişi Özeti</button>
                  <button onClick={()=>setGorunumModu("kayitlar")} style={{padding:"8px 16px",border:"none",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",background:gorunumModu==="kayitlar"?"#2e7d32":"#e0e0e0",color:gorunumModu==="kayitlar"?"#fff":"#555"}}>📋 Tüm Kayıtlar</button>
                </div>
              </>
            )}

            {!isAdmin && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:14,marginBottom:20}}>
                <div style={summaryCard}><div style={summaryVal}>{kayitlar.reduce((s,k)=>s+(k.teslim_edilen||0),0)}</div><div style={summaryLbl}>Toplam Teslim</div></div>
                <div style={summaryCard}><div style={summaryVal}>{kayitlar.reduce((s,k)=>s+(k.toplam_yapilabilir||0),0)}</div><div style={summaryLbl}>Yapılabilir</div></div>
                <div style={{...summaryCard,borderTopColor:"#2e7d32"}}><div style={{...summaryVal,color:"#2e7d32"}}>{kayitlar.reduce((s,k)=>s+(k.yeni_uye||0),0)}</div><div style={summaryLbl}>Yeni Üye</div></div>
                <div style={{...summaryCard,borderTopColor:"#c0392b"}}><div style={{...summaryVal,color:"#c0392b"}}>{kayitlar.reduce((s,k)=>s+(k.mukerrer||0),0)}</div><div style={summaryLbl}>Mükerrer</div></div>
                <div style={{...summaryCard,borderTopColor:"#FF8F00"}}><div style={{...summaryVal,color:"#FF8F00"}}>{hataliUyari}</div><div style={summaryLbl}>Hatalı TC/Seri</div></div>
              </div>
            )}

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
              {isAdmin ? <input style={{...inp,width:260,marginBottom:0}} placeholder="🔍 İsim ara..." value={filtre} onChange={e=>setFiltre(e.target.value)} />
                : <div style={{fontSize:14,color:"#555",fontWeight:600}}>Kayıtlarım — <span style={{color:"#1A2942"}}>{kullanici?.display_name}</span></div>}
              <button style={{...btnPrimary,width:"auto",padding:"9px 18px",background:"#1A2942"}} onClick={()=> gorunumModu === "kisiler" ? excelExportKisiOzet(kisiOzeti, `kisi_ozet_${aktifKategori}_${new Date().toISOString().split("T")[0]}.csv`) : excelExport(filtreliKategori, `tutanak_${aktifKategori}_${new Date().toISOString().split("T")[0]}.csv`)}>📥 Excel İndir</button>
            </div>

            {/* KİŞİ ÖZETİ GÖRÜNÜMÜ */}
            {isAdmin && gorunumModu === "kisiler" && (
              <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{background:"#1A2942",color:"#fff"}}>
                      <th style={{...th,textAlign:"left"}}>İsim Soyisim</th>
                      <th style={th}>Kayıt</th>
                      <th style={th}>Teslim</th>
                      <th style={th}>Yapılabilir</th>
                      <th style={{...th,background:"#2e7d32"}}>Yeni Üye</th>
                      <th style={th}>Silinmiş</th>
                      <th style={th}>Seç.Dışı</th>
                      <th style={th}>İl/İlçe</th>
                      <th style={th}>Mükerrer</th>
                      <th style={th}>B.Parti</th>
                      <th style={{...th,background:"#FF8F00"}}>TC Hatalı</th>
                      <th style={th}>İmzasız</th>
                    </tr></thead>
                    <tbody>
                      {kisiOzeti.length===0 && <tr><td colSpan={12} style={{textAlign:"center",padding:32,color:"#999"}}>Kişi bulunamadı</td></tr>}
                      {kisiOzeti.map((k,i)=>(
                        <tr key={k.isim} style={{background: k.kayit_sayisi === 0 ? "#FFF8E1" : i%2===0?"#fff":"#F8F9FA"}}>
                          <td style={{...td,textAlign:"left",fontWeight:600}}>
                            {k.isim}
                            {k.kayit_sayisi === 0 && <span style={{marginLeft:8,fontSize:10,color:"#FF8F00",fontWeight:400}}>⚠️ Kayıt yok</span>}
                          </td>
                          <td style={{...td,color:k.kayit_sayisi===0?"#999":"inherit"}}>{k.kayit_sayisi || "-"}</td>
                          <td style={{...td,color:k.teslim===0?"#999":"inherit"}}>{k.teslim || "-"}</td>
                          <td style={{...td,color:k.yapilabilir===0?"#999":"inherit"}}>{k.yapilabilir || "-"}</td>
                          <td style={{...td,fontWeight:700,color:k.yeni_uye>0?"#2e7d32":"#999"}}>{k.yeni_uye || "-"}</td>
                          <td style={{...td,color:k.silinmis===0?"#999":"inherit"}}>{k.silinmis || "-"}</td>
                          <td style={{...td,color:k.secmen===0?"#999":"inherit"}}>{k.secmen || "-"}</td>
                          <td style={{...td,color:k.il_ilce===0?"#999":"inherit"}}>{k.il_ilce || "-"}</td>
                          <td style={{...td,color:k.mukerrer>0?"#c0392b":"#999"}}>{k.mukerrer || "-"}</td>
                          <td style={{...td,color:k.baska_parti===0?"#999":"inherit"}}>{k.baska_parti || "-"}</td>
                          <td style={{...td,fontWeight:700,color:k.hatali>0?"#FF8F00":"#999",background:k.hatali>0?"#FFF8E1":"transparent"}}>{k.hatali || "-"}</td>
                          <td style={{...td,color:k.imzasiz===0?"#999":"inherit"}}>{k.imzasiz || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                    {kisiOzeti.length>0 && (
                      <tfoot><tr style={{background:"#1A2942",color:"#fff",fontWeight:700}}>
                        <td style={{...td,textAlign:"left"}}>TOPLAM ({kisiOzeti.length} kişi)</td>
                        <td style={td}>{kisiOzeti.reduce((s,k)=>s+k.kayit_sayisi,0)}</td>
                        <td style={td}>{kisiOzeti.reduce((s,k)=>s+k.teslim,0)}</td>
                        <td style={td}>{kisiOzeti.reduce((s,k)=>s+k.yapilabilir,0)}</td>
                        <td style={{...td,color:"#F4A620"}}>{kisiOzeti.reduce((s,k)=>s+k.yeni_uye,0)}</td>
                        <td style={td}>{kisiOzeti.reduce((s,k)=>s+k.silinmis,0)}</td>
                        <td style={td}>{kisiOzeti.reduce((s,k)=>s+k.secmen,0)}</td>
                        <td style={td}>{kisiOzeti.reduce((s,k)=>s+k.il_ilce,0)}</td>
                        <td style={td}>{kisiOzeti.reduce((s,k)=>s+k.mukerrer,0)}</td>
                        <td style={td}>{kisiOzeti.reduce((s,k)=>s+k.baska_parti,0)}</td>
                        <td style={{...td,color:"#F4A620"}}>{kisiOzeti.reduce((s,k)=>s+k.hatali,0)}</td>
                        <td style={td}>{kisiOzeti.reduce((s,k)=>s+k.imzasiz,0)}</td>
                      </tr></tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* TÜM KAYITLAR GÖRÜNÜMÜ */}
            {(gorunumModu === "kayitlar" || !isAdmin) && (
              <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{background:"#1A2942",color:"#fff"}}>
                      <th style={th}>Tarih</th><th style={th}>Tutanak No</th>
                      {isAdmin && <th style={{...th,textAlign:"left"}}>İsim Soyisim</th>}
                      <th style={th}>Teslim</th><th style={th}>Yapılabilir</th><th style={{...th,background:"#2e7d32"}}>Yeni Üye</th>
                      <th style={th}>Silinmiş</th><th style={th}>Seç.Dışı</th><th style={th}>İl/İlçe</th><th style={th}>Mükerrer</th><th style={th}>B.Parti</th>
                      <th style={{...th,background:"#FF8F00"}}>TC Hatalı</th><th style={th}>İmzasız</th>{isAdmin && <th style={th}>İşlem</th>}
                    </tr></thead>
                    <tbody>
                      {filtreliKategori.length===0 && <tr><td colSpan={isAdmin?14:12} style={{textAlign:"center",padding:32,color:"#999"}}>Kayıt bulunamadı</td></tr>}
                      {filtreliKategori.map((k,i)=>(
                        <tr key={k.id} style={{background:i%2===0?"#fff":"#F8F9FA"}}>
                          <td style={td}>{k.tutanak_tarih}</td><td style={td}>{k.tutanak_no||"-"}</td>
                          {isAdmin && <td style={{...td,textAlign:"left",fontWeight:600}}>{k.isim_soyisim}</td>}
                          <td style={td}>{k.teslim_edilen}</td><td style={td}>{k.toplam_yapilabilir}</td>
                          <td style={{...td,fontWeight:700,color:"#2e7d32"}}>{k.yeni_uye}</td>
                          <td style={td}>{k.silinmis_uye||"-"}</td><td style={td}>{k.secmen_olmayan||"-"}</td><td style={td}>{k.il_ilce_disi||"-"}</td>
                          <td style={{...td,color:k.mukerrer>0?"#c0392b":"inherit"}}>{k.mukerrer||"-"}</td><td style={td}>{k.baska_parti_uyesi||"-"}</td>
                          <td style={{...td,fontWeight:700,color:k.tc_seri_no_hatali>0?"#FF8F00":"inherit",background:k.tc_seri_no_hatali>0?"#FFF8E1":"transparent"}}>{k.tc_seri_no_hatali||"-"}</td>
                          <td style={td}>{k.imzasiz||"-"}</td>
                          {isAdmin && <td style={td}>
                            {silOnay===k.id ? <span><button style={{fontSize:11,background:"#c0392b",color:"#fff",border:"none",borderRadius:4,padding:"2px 8px",cursor:"pointer",marginRight:4}} onClick={()=>sil(k.id)}>Sil</button><button style={{fontSize:11,background:"#ccc",border:"none",borderRadius:4,padding:"2px 8px",cursor:"pointer"}} onClick={()=>setSilOnay(null)}>İptal</button></span>
                              : <button style={{fontSize:11,background:"transparent",color:"#c0392b",border:"1px solid #c0392b",borderRadius:4,padding:"2px 8px",cursor:"pointer"}} onClick={()=>setSilOnay(k.id)}>Sil</button>}
                          </td>}
                        </tr>
                      ))}
                    </tbody>
                    {filtreliKategori.length>0 && (
                      <tfoot><tr style={{background:"#1A2942",color:"#fff",fontWeight:700}}>
                        <td colSpan={isAdmin?3:2} style={{...td,textAlign:"right"}}>TOPLAM ({filtreliKategori.length})</td>
                        {["teslim_edilen","toplam_yapilabilir","yeni_uye","silinmis_uye","secmen_olmayan","il_ilce_disi","mukerrer","baska_parti_uyesi","tc_seri_no_hatali","imzasiz"].map(key=>(
                          <td key={key} style={{...td,color:key==="yeni_uye"||key==="tc_seri_no_hatali"?"#F4A620":"#fff"}}>{filtreliKategori.reduce((s,r)=>s+(r[key]||0),0)}</td>
                        ))}
                        {isAdmin && <td style={td}></td>}
                      </tr></tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {screen==="rapor" && isAdmin && (
          <div>
            <div style={{background:"#fff",borderRadius:10,padding:20,marginBottom:20,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
              <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:6}}>
                  {[{k:"haftalik",l:"Bu Hafta"},{k:"aylik",l:"Bu Ay"},{k:"ozel",l:"Özel Tarih"}].map(t=>(
                    <button key={t.k} onClick={()=>setRaporTur(t.k)} style={{padding:"8px 16px",border:"none",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",background:raporTur===t.k?"#1A2942":"#eee",color:raporTur===t.k?"#fff":"#555"}}>{t.l}</button>
                  ))}
                </div>
                {raporTur==="ozel" && (
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="date" style={{...inp,width:140}} value={raporBaslangic} onChange={e=>setRaporBaslangic(e.target.value)} />
                    <span style={{color:"#999"}}>—</span>
                    <input type="date" style={{...inp,width:140}} value={raporBitis} onChange={e=>setRaporBitis(e.target.value)} />
                  </div>
                )}
                <div style={{marginLeft:"auto",fontSize:13,color:"#666"}}>📅 {raporBaslangic} — {raporBitis} <span style={{marginLeft:8,fontWeight:700,color:"#1A2942"}}>({raporKayitlari.length} kayıt)</span></div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
              <div style={{...summaryCard,borderTopColor:"#1A2942"}}><div style={summaryVal}>{genelToplam.teslim}</div><div style={summaryLbl}>Toplam Teslim</div></div>
              <div style={{...summaryCard,borderTopColor:"#1E3A5F"}}><div style={summaryVal}>{genelToplam.yapilabilir}</div><div style={summaryLbl}>Yapılabilir</div></div>
              <div style={{...summaryCard,borderTopColor:"#2e7d32"}}><div style={{...summaryVal,color:"#2e7d32"}}>{genelToplam.yeni_uye}</div><div style={summaryLbl}>Yeni Üye</div></div>
              <div style={{...summaryCard,borderTopColor:"#c0392b"}}><div style={{...summaryVal,color:"#c0392b"}}>{genelToplam.mukerrer}</div><div style={summaryLbl}>Mükerrer</div></div>
              <div style={{...summaryCard,borderTopColor:"#FF8F00"}}><div style={{...summaryVal,color:"#FF8F00"}}>{genelToplam.hatali}</div><div style={summaryLbl}>TC Hatalı</div></div>
            </div>

            <div style={{background:"#fff",borderRadius:10,padding:20,marginBottom:20,boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
              <div style={{fontSize:15,fontWeight:700,color:"#1A2942",marginBottom:16,borderBottom:"2px solid #F4A620",paddingBottom:8}}>📊 Kategori Bazlı Özet</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14}}>
                {Object.entries(KAT_LABELS).map(([key, val]) => (
                  <div key={key} style={{background:"#F8F9FA",borderRadius:8,padding:16,borderLeft:"4px solid #1A2942"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#1A2942",marginBottom:10}}>{val.icon} {val.label}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:13}}>
                      <div><span style={{color:"#888"}}>Kişi:</span> <strong>{kategoriOzet[key]?.kisi_sayisi || 0}</strong></div>
                      <div><span style={{color:"#888"}}>Teslim:</span> <strong>{kategoriOzet[key]?.teslim || 0}</strong></div>
                      <div><span style={{color:"#2e7d32"}}>Yeni Üye:</span> <strong style={{color:"#2e7d32"}}>{kategoriOzet[key]?.yeni_uye || 0}</strong></div>
                      <div><span style={{color:"#c0392b"}}>Mükerrer:</span> <strong style={{color:"#c0392b"}}>{kategoriOzet[key]?.mukerrer || 0}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
              <div style={{padding:"14px 20px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#1A2942"}}>🏆 Kişi Bazlı Sıralama (Yeni Üye)</div>
                <button style={{...btnPrimary,width:"auto",padding:"8px 16px",fontSize:13}} onClick={()=>excelExport(raporKayitlari, `rapor_${raporBaslangic}_${raporBitis}.csv`)}>📥 Rapor İndir</button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{background:"#F5F7FA"}}>
                    <th style={{...th,textAlign:"center",color:"#555",width:40}}>#</th>
                    <th style={{...th,textAlign:"left",color:"#555"}}>İsim Soyisim</th>
                    <th style={{...th,color:"#555"}}>Kayıt</th><th style={{...th,color:"#555"}}>Teslim</th><th style={{...th,color:"#555"}}>Yapılabilir</th>
                    <th style={{...th,color:"#2e7d32",background:"#E8F5E9"}}>Yeni Üye</th><th style={{...th,color:"#c0392b"}}>Mükerrer</th><th style={{...th,color:"#FF8F00"}}>TC Hatalı</th>
                  </tr></thead>
                  <tbody>
                    {kisiSirali.length===0 && <tr><td colSpan={8} style={{textAlign:"center",padding:32,color:"#999"}}>Bu tarih aralığında kayıt bulunamadı</td></tr>}
                    {kisiSirali.map((k,i)=>(
                      <tr key={k.isim} style={{background:i%2===0?"#fff":"#FAFBFC"}}>
                        <td style={{...td,fontWeight:700,color:i<3?"#F4A620":"#999"}}>{i+1}</td>
                        <td style={{...td,textAlign:"left",fontWeight:600}}>{k.isim}</td>
                        <td style={td}>{k.kayit_sayisi}</td><td style={td}>{k.teslim}</td><td style={td}>{k.yapilabilir}</td>
                        <td style={{...td,fontWeight:700,color:"#2e7d32",background:"#E8F5E9"}}>{k.yeni_uye}</td>
                        <td style={{...td,color:k.mukerrer>0?"#c0392b":"inherit"}}>{k.mukerrer||"-"}</td>
                        <td style={{...td,color:k.hatali>0?"#FF8F00":"inherit"}}>{k.hatali||"-"}</td>
                      </tr>
                    ))}
                  </tbody>
                  {kisiSirali.length>0 && (
                    <tfoot><tr style={{background:"#1A2942",color:"#fff",fontWeight:700}}>
                      <td colSpan={2} style={{...td,textAlign:"right"}}>TOPLAM ({kisiSirali.length} kişi)</td>
                      <td style={td}>{raporKayitlari.length}</td><td style={td}>{genelToplam.teslim}</td><td style={td}>{genelToplam.yapilabilir}</td>
                      <td style={{...td,color:"#F4A620"}}>{genelToplam.yeni_uye}</td><td style={td}>{genelToplam.mukerrer}</td><td style={td}>{genelToplam.hatali}</td>
                    </tr></tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {screen==="kullanicilar" && isAdmin && (
          <div>
            <div style={{background:"#fff",borderRadius:10,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",marginBottom:20}}>
              <div style={{fontSize:16,fontWeight:700,color:"#1A2942",marginBottom:18,borderBottom:"2px solid #F4A620",paddingBottom:10}}>➕ Yeni Kullanıcı Ekle</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:16}}>
                <div><label style={lbl}>Kullanıcı Adı *</label><input style={inp} placeholder="kullanici_adi" value={yeniKullanici.username} onChange={e=>setYeniKullanici(p=>({...p,username:e.target.value}))} /></div>
                <div><label style={lbl}>Şifre *</label><input style={inp} placeholder="sifre123" value={yeniKullanici.password} onChange={e=>setYeniKullanici(p=>({...p,password:e.target.value}))} /></div>
                <div><label style={lbl}>Görünen İsim *</label><input style={inp} placeholder="Adı Soyadı" value={yeniKullanici.display_name} onChange={e=>setYeniKullanici(p=>({...p,display_name:e.target.value}))} /></div>
                <div><label style={lbl}>Rol *</label><select style={inp} value={yeniKullanici.rol} onChange={e=>setYeniKullanici(p=>({...p,rol:e.target.value}))}><option value="uye">Üye (salt okunur)</option><option value="admin">Admin (tam yetki)</option></select></div>
                {yeniKullanici.rol==="uye" && (
                  <div><label style={lbl}>Eşleşecek İsim *</label>
                    <select style={inp} value={yeniKullanici.isim_soyisim} onChange={e=>setYeniKullanici(p=>({...p,isim_soyisim:e.target.value}))}>
                      <option value="">-- Seçiniz --</option>
                      {Object.entries(KAT_LABELS).map(([key, val]) => (
                        <optgroup key={key} label={`${val.icon} ${val.label}`}>
                          {kisilerByKategori(key).map(k=><option key={k.id} value={k.isim_soyisim}>{k.isim_soyisim}</option>)}
                        </optgroup>
                      ))}
                    </select></div>
                )}
              </div>
              {kullaniciMesaj && <div style={{marginBottom:14,padding:"10px 14px",background:kullaniciMesaj.startsWith("✅")?"#e8f5e9":"#fdecea",borderRadius:6,fontSize:14,color:kullaniciMesaj.startsWith("✅")?"#2e7d32":"#c0392b"}}>{kullaniciMesaj}</div>}
              <button style={{...btnPrimary,width:"auto",padding:"10px 28px"}} onClick={kullaniciEkle}>👤 Kullanıcı Ekle</button>
            </div>
            <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
              <div style={{padding:"14px 18px",borderBottom:"1px solid #eee",fontWeight:700,color:"#1A2942"}}>📋 Mevcut Kullanıcılar ({kullanicilar.length})</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#F5F7FA"}}>
                  <th style={{...th,textAlign:"left",color:"#555"}}>Kullanıcı Adı</th><th style={{...th,textAlign:"left",color:"#555"}}>Görünen İsim</th>
                  <th style={{...th,color:"#555"}}>Rol</th><th style={{...th,textAlign:"left",color:"#555"}}>Eşleşen İsim</th><th style={{...th,color:"#555"}}>İşlem</th>
                </tr></thead>
                <tbody>
                  {kullanicilar.map((k,i)=>(
                    <tr key={k.id} style={{background:i%2===0?"#fff":"#FAFBFC"}}>
                      <td style={{...td,textAlign:"left",fontWeight:600}}>{k.username}</td><td style={{...td,textAlign:"left"}}>{k.display_name}</td>
                      <td style={td}><span style={{padding:"2px 10px",borderRadius:4,fontSize:11,fontWeight:700,background:k.rol==="admin"?"#1A2942":"#F4A620",color:k.rol==="admin"?"#fff":"#1A2942"}}>{k.rol==="admin"?"Admin":"Üye"}</span></td>
                      <td style={{...td,textAlign:"left",color:k.isim_soyisim?"inherit":"#999"}}>{k.isim_soyisim||"-"}</td>
                      <td style={td}>{k.username!=="admin" && <button style={{fontSize:11,background:"transparent",color:"#c0392b",border:"1px solid #c0392b",borderRadius:4,padding:"2px 10px",cursor:"pointer"}} onClick={()=>kullaniciSil(k.id)}>Sil</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const lbl = {display:"block",fontSize:12,fontWeight:600,color:"#555",marginBottom:4};
const inp = {width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:14,fontFamily:"Calibri,sans-serif",boxSizing:"border-box"};
const btnPrimary = {width:"100%",padding:11,background:"#1A2942",color:"#fff",border:"none",borderRadius:7,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"Calibri,sans-serif"};
const btnSec = {padding:"6px 14px",border:"none",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"Calibri,sans-serif"};
const th = {padding:"10px 8px",textAlign:"center",fontSize:11.5,fontWeight:600,whiteSpace:"nowrap"};
const td = {padding:"8px",textAlign:"center",borderBottom:"1px solid #eee",fontSize:13};
const summaryCard = {background:"#fff",borderRadius:10,padding:"18px 14px",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",textAlign:"center",borderTop:"3px solid #ddd"};
const summaryVal = {fontSize:28,fontWeight:700,color:"#1A2942",lineHeight:1,marginBottom:4};
const summaryLbl = {fontSize:11,color:"#888",fontWeight:500};