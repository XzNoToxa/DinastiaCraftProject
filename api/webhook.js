const net = require('net');

// Функция для отправки команд на сервер по RCON
function sendRconCommand(command) {
  return new Promise((resolve, reject) => {
    const host = process.env.RCON_HOST || "dinastia.mc-join.pro";
    const port = parseInt(process.env.RCON_PORT) || 25575;
    const password = process.env.RCON_PASSWORD || "";

    const client = new net.Socket();
    let authenticated = false;

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
      // Отправляем пакет авторизации RCON (тип 3)
      writePacket(1, 3, password);
    });

    client.on('data', (data) => {
      const id = data.readInt32LE(4);
      const type = data.readInt32LE(8);

      if (!authenticated) {
        if (id === 1 && type === 2) {
          authenticated = true;
          // Отправляем саму команду (тип 2)
          writePacket(2, 2, command);
        } else {
          client.destroy();
          reject(new Error("RCON Authentication failed"));
        }
      } else {
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
    const status = event.status;
    const description = event.description || "";

    // Проверяем, что платеж успешно подтвержден кассой Platega
    if (status === 'CONFIRMED') {
      console.log(`Успешный платеж подтвержден: ${description}`);

      // Парсим описание вида: "Покупка [VIP] для XzNoToxa" или "Покупка [Разбан] для XzNoToxa"
      const match = description.match(/Покупка \[(.*?)\] для (.*)/i);
      
      if (match) {
        const item = match[1].toLowerCase().trim();
        const nick = match[2].trim();

        if (item.includes('разбан') || item.includes('unban')) {
          // Выполняем разбан (в зависимости от плагина: unban или pardon)
          await sendRconCommand(`unban ${nick}`);
          console.log(`Выдан разбан для игрока ${nick}`);
        } else {
          // Выдаем привилегию через LuckPerms
          await sendRconCommand(`lp user ${nick} parent add ${item}`);
          console.log(`Выдана привилегия [${item}] для игрока ${nick}`);
        }
      }

      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
};