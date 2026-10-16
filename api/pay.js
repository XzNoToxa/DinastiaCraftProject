export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount, nick, item } = req.body;
  // Merchant ID (публичный)
  const MERCHANT_ID = "36a5076d-f4ce-4dde-820e-70b3baa91f2d";
  // Секретный API ключ берем из переменных окружения Vercel
  const API_KEY = process.env.PLATEGA_API_KEY; 

  try {
    const response = await fetch("https://api.platega.io/v1/payments/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        merchant_id: MERCHANT_ID,
        amount: amount,
        order_id: `${nick}_${Date.now()}`,
        description: `Покупка [${item}] для игрока ${nick}`
      })
    });

    const data = await response.json();
    
    if (data.payment_url) {
      return res.status(200).json({ url: data.payment_url });
    } else {
      return res.status(400).json({ error: 'Ошибка создания платежа в Platega', details: data });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
