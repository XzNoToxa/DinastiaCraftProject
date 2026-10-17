module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount, nick, item, paymentMethod } = req.body || {};

  // Проверка никнейма (только английские буквы, цифры и _, от 3 до 16 символов)
  if (!nick || !/^[a-zA-Z0-9_]{3,16}\$/.test(nick.trim())) {
    return res.status(400).json({ error: 'Введите корректный никнейм игрока!' });
  }

  if (!item) {
    return res.status(400).json({ error: 'Товар не выбран!' });
  }

  const cleanNick = nick.trim();
  let productKey = item.toLowerCase().trim();

  // Если покупают разбан по-русски ("Разбан"), переводим ключ в "unban" для config.yml
  if (productKey.includes('разбан') || productKey.includes('unban')) {
    productKey = 'unban';
  }

  const MERCHANT_ID = process.env.PLATEGA_MERCHANT_ID || "36a5076d-f4ce-4dde-820e-70b3baa91f2d";
  const API_KEY = process.env.PLATEGA_API_KEY || "Cd0NIdkiVYYxDjRHKr0m0vEprSEErkmbII1qxtwgba3SOI7xPIMfDVGlDf1TSmR4EdPaPWypkHl7PGfTIXOKMGJxYyuy2gu7XbKC";

  try {
    const requestBody = {
      paymentMethod: parseInt(paymentMethod) || 2, // 2 = СБП QR (по умолчанию), 10 = Карты РФ
      paymentDetails: {
        amount: Number(amount) || 0,
        currency: "RUB"
      },
      description: `Покупка [${item}] для ${cleanNick}`,
      return: "https://www.dinastiacraft.store/",
      returnUrl: "https://www.dinastiacraft.store/",
      failedUrl: "https://www.dinastiacraft.store/",
      // Главная строчка для нашего плагина! Формат "Ник:товар"
      payload: `${cleanNick}:${productKey}`
    };

    // Пробуем создать транзакцию через актуальный эндпоинт Platega
    const response = await fetch("https://app.platega.io/transaction/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MerchantId": MERCHANT_ID,
        "X-Secret": API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    const text = await response.text();

    try {
      const data = JSON.parse(text);
      const paymentLink = data.redirect || data.url || data.paymentUrl || data.payment_url;

      if (paymentLink) {
        return res.status(200).json({ url: paymentLink });
      } else {
        return res.status(400).json({ error: 'Ошибка кассы: ' + JSON.stringify(data) });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Ошибка парсинга ответа: ' + text.substring(0, 150) });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Сетевая ошибка: ' + error.message });
  }
};