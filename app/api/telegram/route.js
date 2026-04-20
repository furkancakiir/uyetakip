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

    // /start komutu
    if (text === "/start") {
      await sendMessage(chatId, 
        `🎉 Merhaba ${firstName}!\n\n` +
        `AK Parti Başakşehir BİT Komisyonu\n` +
        `Üye Takip Sistemi'ne hoş geldiniz.\n\n` +
        `📱 Lütfen sistemde kayıtlı telefon numaranızı girin:\n` +
        `Örnek: 5321234567`
      );
      return Response.json({ ok: true });
    }

    // Telefon numarası kontrolü
    const cleanPhone = normalizePhone(text);
    
    if (cleanPhone && cleanPhone.length === 10 && cleanPhone.startsWith("5")) {
      // Veritabanında tüm kişileri al
      const { data: kisiler } = await supabase
        .from("kisiler")
        .select("*")
        .eq("is_active", true);

      // Telefon eşleştir
      const kisi = kisiler?.find(k => {
        const dbPhone = normalizePhone(k.telefon);
        return dbPhone === cleanPhone;
      });

      if (kisi) {
        // Telegram ID'yi kaydet
        await supabase
          .from("kisiler")
          .update({ telegram_id: chatId.toString() })
          .eq("id", kisi.id);

        await sendMessage(chatId,
          `✅ Kayıt Başarılı!\n\n` +
          `👤 ${kisi.isim_soyisim}\n` +
          `🏘️ Mahalle: ${kisi.mahalle || "—"}\n\n` +
          `Artık size ait tutanak kayıtlarında bildirim alacaksınız.`
        );
      } else {
        await sendMessage(chatId,
          `❌ Bu telefon numarası sistemde bulunamadı.\n\n` +
          `Lütfen sistemde kayıtlı telefon numaranızı girin veya yöneticinize başvurun.`
        );
      }
      return Response.json({ ok: true });
    }

    // Diğer mesajlar
    await sendMessage(chatId,
      `📱 Lütfen geçerli bir telefon numarası girin.\nÖrnek: 5321234567`
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
