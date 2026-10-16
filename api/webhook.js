const net = require('net');

// Функция для отправки команд на сервер по RCON
function sendRconCommand(command) {
  return new Promise((resolve, reject) => {
    const host = process.env.RCON_HOST || "dinastia.mc-join.pro";
    const port = parseInt(process.env.RCON_PORT) || 25575;
    const password = process.env.RCON_PASSWORD || "";

    const client = new net.Socket();
    let authenticated = false;

    // Простой пакет RCON (Server-to-Client / Client-to-Server пакеты)
    function writePacket(id, type, payload) {
      const payloadBuf = Buffer.from(payload, 'utf8');
      const length = payloadBuf.length + 10;
      const buf = Buffer.alloc(length + 4);
      buf.writeInt32LE(length, 0);
      buf.writeInt32LE(id, 4);
      buf.writeInt32LE(type, 8);
      payloadBuf.copy(buf, 12);
      buf.writeInt8(0, length + 2);
      buf.writeInt8(0, length + 3);
      client.write(buf);
    }

    client.connect(port, host, () => {
      // Отправляем пакет авторизации (тип 3)
      writePacket(1, 3, password);
    });

    client.on('data', (data) => {
      const id = data.readInt32LE(4);
      const type = data.readInt32LE(8);

      if (!authenticated) {
        if (id === 1 && type === 2) {
          // Авторизация успешна, отправляем саму команду (тип 2)
          authenticated = true;
          writePacket(2, 2, command);
        } else {
          client.destroy();
          reject(new Error("RCON Authentication failed"));
        }
      } else {
        // Команда выполнена
        client.destroy();
        resolve(true);
      }
    });

    client.on('error', (err) => {
      client.destroy();
      reject(err);
    });
  });
}

module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const event = req.body || {};
    
    // Структура вебхука Platega согласно документации
    const status = event.status;
    const description = event.description || ""; // Здесь у нас зашита команда или инфо о товаре
    const paymentDetails = event.paymentDetails || {};
    
    // Проверяем, что платеж успешно подтвержден (CONFIRMED)
    if (status === 'CONFIRMED') {
      // Пример описания товара/команды, переданной при создании платежа: "Покупка [VIP] для XzNoToxa" или готовая команда
      // Парсим ник игрока и товар из описания
      
      console.log(`Успешный платеж обработан: ${description}`);
      
      // Пример автоматического выполнения консольной команды через RCON:
      // Если в description передана команда или мы формируем её на лету:
      // await sendRconCommand(`lp user ${nick} parent set ${item}`);

      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
};