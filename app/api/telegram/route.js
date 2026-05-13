import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TELEGRAM_TOKEN = "8685265365:AAFVhfEyu93a5THUFGh83YBEpbNhFBeDMa4";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

// Telefon numarasını normalize et (sadece rakamlar, başında 0 olmadan)
function normalizePhone(phone) {
  if (!phone) return "";
  // Tüm rakam olmayanları kaldır
  let clean = phone.toString().replace(/\D/g, "");
  // Başındaki 90 veya 0'ı kaldır
  if (clean.startsWith("90") && clean.length === 12) clean = clean.slice(2);
  if (clean.startsWith("0") && clean.length === 11) clean = clean.slice(1);
  return clean;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const message = body.message;
    
    if (!message) {
      return Response.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text?.trim();
    const firstName = message.from?.first_name || "";

    // Veritabanında bu Telegram ID ile kayıtlı kişi var mı?
    const { data: kisiler } = await supabase
      .from("kisiler")
      .select("*")
      .eq("telegram_id", chatId.toString())
      .eq("is_active", true);

    const kayitliKisi = kisiler && kisiler.length > 0 ? kisiler[0] : null;

    // /start komutu
    if (text === "/start") {
      if (kayitliKisi) {
        await sendMessage(chatId, 
          `✅ Merhaba ${kayitliKisi.isim_soyisim}!\n\n` +
          `Telegram hesabınız sisteme kayıtlı.\n` +
          `🏘️ Mahalle: ${kayitliKisi.mahalle || "—"}\n\n` +
          `Tutanak kayıtlarınız girildiğinde bildirim alacaksınız.`
        );
      } else {
        await sendMessage(chatId, 
          `👋 Merhaba ${firstName}!\n\n` +
          `AK Parti Başakşehir\n` +
          `Bilgi ve İletişim Teknolojileri Komisyonu\n` +
          `Üye Takip Sistemi\n\n` +
          `⚠️ Telegram hesabınız sistemde kayıtlı değil.\n\n` +
          `Kayıt için lütfen Bilgi ve İletişim Teknolojileri Komisyonu ile iletişime geçin.`
        );
      }
      return Response.json({ ok: true });
    }

    // /durum komutu
    if (text === "/durum") {
      if (kayitliKisi) {
        // Son kayıtları getir
        const { data: sonKayitlar } = await supabase
          .from("tutanak_kayitlari")
          .select("*")
          .eq("isim_soyisim", kayitliKisi.isim_soyisim)
          .order("tutanak_tarih", { ascending: false })
          .limit(3);

        let mesaj = `📊 *DURUM*\n\n`;
        mesaj += `👤 ${kayitliKisi.isim_soyisim}\n`;
        mesaj += `🏘️ ${kayitliKisi.mahalle || "—"}\n`;
        mesaj += `🎯 Hedef: ${kayitliKisi.hedef || 0}\n\n`;

        if (sonKayitlar && sonKayitlar.length > 0) {
          const toplamYeni = sonKayitlar.reduce((s, k) => s + (k.yeni_uye || 0), 0);
          mesaj += `📋 Son ${sonKayitlar.length} kayıt:\n`;
          mesaj += `✅ Toplam Yeni Üye: ${toplamYeni}\n`;
        } else {
          mesaj += `📋 Henüz kayıt yok.`;
        }

        await sendMessage(chatId, mesaj);
      } else {
        await sendMessage(chatId, `⚠️ Sistemde kayıtlı değilsiniz.`);
      }
      return Response.json({ ok: true });
    }

    // Diğer mesajlar
    await sendMessage(chatId,
      `📌 Kullanılabilir komutlar:\n\n` +
      `/start - Kayıt durumu\n` +
      `/durum - Son kayıtlarınız`
    );

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return Response.json({ ok: false, error: error.message });
  }
}

export async function GET() {
  return Response.json({ status: "Telegram bot is running" });
}
