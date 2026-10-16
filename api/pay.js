module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount, nick, item } = req.body || {};
  const MERCHANT_ID = "36a5076d-f4ce-4dde-820e-70b3baa91f2d";
  const API_KEY = process.env.PLATEGA_API_KEY || "";

  try {
    const response = await fetch("https://app.platega.io/api/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MerchantId": MERCHANT_ID,
        "X-Secret": API_KEY
      },
      body: JSON.stringify({
        amount: amount || 0,
        order_id: `${nick}_${Date.now()}`,
        description: `Покупка [${item}] для игрока ${nick}`
      })
    });

    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      if (data.url || data.payment_url) {
        return res.status(200).json({ url: data.url || data.payment_url });
      } else {
        // Если Platega отказывает, возвращаем 400, чтобы сайт выдал alert
        return res.status(400).json({ error: text.substring(0, 150) });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Сбой парсинга Platega: ' + text.substring(0, 150) });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Сетевая ошибка: ' + error.message });
  }
};