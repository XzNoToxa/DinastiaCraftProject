module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Безопасно читаем тело запроса (работает и если Vercel прислал строку, и если объект)
  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const amount = body.amount;
  const nick = String(body.nick || '').trim();
  const item = String(body.item || '').trim();

  if (!nick) {
    return res.status(400).json({ error: 'Никнейм не получен сервером' });
  }

  let productKey = item.toLowerCase();
  if (productKey.includes('разбан') || productKey.includes('unban')) {
    productKey = 'unban';
  }

  const MERCHANT_ID = process.env.PLATEGA_MERCHANT_ID || "36a5076d-f4ce-4dde-820e-70b3baa91f2d";
  const API_KEY = process.env.PLATEGA_API_KEY || "Cd0NIdkiVYYxDjRHKr0m0vEprSEErkmbII1qxtwgba3SOI7xPIMfDVGlDf1TSmR4EdPaPWypkHl7PGfTIXOKMGJxYyuy2gu7XbKC";

  try {
    const response = await fetch("https://app.platega.io/v2/transaction/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MerchantId": MERCHANT_ID,
        "X-Secret": API_KEY
      },
      body: JSON.stringify({
        paymentDetails: {
          amount: parseInt(amount) || 1,
          currency: "RUB"
        },
        command: `lp user ${nick} parent set ${productKey}`,
        description: `Покупка [${productKey}] для ${nick}`,
        payload: `${nick}:${productKey}`,
        return: "https://www.dinastiacraft.store/",
        returnUrl: "https://www.dinastiacraft.store/",
        failedUrl: "https://www.dinastiacraft.store/"
      })
    });

    const text = await response.text();

    try {
      const data = JSON.parse(text);
      const paymentLink = data.url || data.redirect || data.paymentUrl || data.payment_url;

      if (paymentLink) {
        return res.status(200).json({ url: paymentLink });
      } else {
        return res.status(400).json({ error: 'Ошибка кассы: ' + JSON.stringify(data) });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Ошибка парсинга ответа: ' + text.substring(0, 100) });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Сетевая ошибка: ' + error.message });
  }
};