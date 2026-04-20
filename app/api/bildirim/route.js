const TELEGRAM_TOKEN = "8685265365:AAFVhfEyu93a5THUFGh83YBEpbNhFBeDMa4";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

export async function POST(request) {
  try {
    const { telegram_id, isim_soyisim, teslim, yeni_uye, mukerrer } = await request.json();

    if (!telegram_id) {
      return Response.json({ ok: false, error: "Telegram ID yok" });
    }

    const mesaj = 
      `📋 Yeni Tutanak Kaydı\n\n` +
      `👤 ${isim_soyisim}\n` +
      `📦 Teslim: ${teslim || 0}\n` +
      `✅ Yeni Üye: ${yeni_uye || 0}\n` +
      `${mukerrer > 0 ? `⚠️ Mükerrer: ${mukerrer}\n` : ""}` +
      `\n📅 ${new Date().toLocaleDateString("tr-TR")}`;

    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegram_id,
        text: mesaj,
      }),
    });

    const result = await response.json();
    return Response.json({ ok: result.ok });
  } catch (error) {
    console.error("Bildirim hatası:", error);
    return Response.json({ ok: false, error: error.message });
  }
}
