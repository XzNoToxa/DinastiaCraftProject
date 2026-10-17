module.exports = async function (req, res) {
  // Якщо Platega робить тестову GET-перевірку при збереженні URL — відповідаємо 200 OK
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'OK' });
  }

  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // Якщо в платежі немає поля payload, автоматично дістаємо Нік і Товар із description:
    // Наприклад, із "Покупка [VIP] для XzNoToxa" зробить payload "XzNoToxa:vip"
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

    // Беремо заголовки авторизації від Platega (або з налаштувань Vercel)
    const merchantId =
      req.headers['x-merchantid'] ||
      process.env.PLATEGA_MERCHANT_ID ||
      '36a5076d-f4ce-4dde-820e-70b3baa91f2d';

    const secretKey =
      req.headers['x-secret'] ||
      process.env.PLATEGA_SECRET_KEY ||
      'Cd0NIdkiVYYxDjRHKr0m0vEprSEErkmbII1qxtwgba3SOI7xPIMfDVGlDf1TSmR4EdPaPWypkHl7PGfTIXOKMGJxYyuy2gu7XbKC';

    // Пересилаємо підтверджений платіж напряму на твій плагін у Velocity ("Кролик")
    const velocityUrl = 'http://d23.aurorix.net:25583/platega/webhook';

    const response = await fetch(velocityUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MerchantId': merchantId,
        'X-Secret': secretKey,
      },
      body: JSON.stringify(event),
    });

    const resultText = await response.text();
    console.log(`Відповідь від плагіна Velocity (${response.status}):`, resultText);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    // Повертаємо 200, щоб Platega не блокувала вебхук при тимчасових збоях мережі
    return res.status(200).json({ error: error.message });
  }
};