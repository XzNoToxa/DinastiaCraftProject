module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount, nick, item } = req.body || {};
  const MERCHANT_ID = "36a5076d-f4ce-4dde-820e-70b3baa91f2d";
  const API_KEY = process.env.PLATEGA_API_KEY || "";

  try {
    const response = await fetch("https://app.platega.io/transaction/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MerchantId": MERCHANT_ID,
        "X-Secret": API_KEY
      },
      body: JSON.stringify({
        paymentMethod: "CardRu", // Исправлено по требованию Platega
        paymentDetails: {
          amount: parseInt(amount) || 0,
          currency: "RUB"
        },
        description: `Покупка [${item}] для ${nick}`,
        returnUrl: "https://www.dinastiacraft.store/",
        failedUrl: "https://www.dinastiacraft.store/"
      })
    });

    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      if (data.redirect || data.url) {
        return res.status(200).json({ url: data.redirect || data.url });
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