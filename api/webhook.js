module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'OK' });
  }

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // Страховка: если payload пустой, достаем "Ник:товар" из description
    if (!event.payload && event.description) {
      const match = event.description.match(/Покупка \[(.*?)\] для (.*)/i);
      if (match) {
        let item = match[1].toLowerCase().trim();
        const nick = match[2].trim();
        if (item.includes('разбан') || item.includes('unban')) {
          item = 'unban';
        }
        event.payload = `${nick}:${item}`;
      }
    }

    const MERCHANT_ID =
      req.headers['x-merchantid'] ||
      process.env.PLATEGA_MERCHANT_ID ||
      '36a5076d-f4ce-4dde-820e-70b3baa91f2d';

    const API_KEY =
      req.headers['x-secret'] ||
      process.env.PLATEGA_API_KEY ||
      'Cd0NIdkiVYYxDjRHKr0m0vEprSEErkmbII1qxtwgba3SOI7xPIMfDVGlDf1TSmR4EdPaPWypkHl7PGfTIXOKMGJxYyuy2gu7XbKC';

    // Отправляем вебхук на твой прокси Velocity ("Кролик")
    const velocityResponse = await fetch('http://d23.aurorix.net:25583/platega/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MerchantId': MERCHANT_ID,
        'X-Secret': API_KEY,
      },
      body: JSON.stringify(event),
    });

    const text = await velocityResponse.text();
    console.log(`Ответ Velocity (${velocityResponse.status}):`, text);

    return res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(200).json({ status: 'OK', warning: error.message });
  }
};