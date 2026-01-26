import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

let botInfo = null;

// Получаем информацию о боте
bot.getMe().then((me) => {
  botInfo = me;
  console.log(`✅ Бот запущен: @${me.username} (ID: ${me.id})`);
  console.log(`\n📝 Инструкция:`);
  console.log(`   1. Отправьте ЛЮБОЕ сообщение в ваш канал`);
  console.log(`   2. Или перешлите сообщение из канала боту @${me.username}`);
  console.log(`   3. Или отправьте команду /getchannelid из канала\n`);
  console.log(`⏳ Ожидаю сообщения...\n`);
}).catch((err) => {
  console.error("❌ Ошибка получения информации о боте:", err.message);
  process.exit(1);
});

// Обработчик всех сообщений
bot.on("message", async (msg) => {
  if (!botInfo) return;
  
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  const chatTitle = msg.chat.title || msg.chat.username || "Без названия";

  console.log(`📨 Получено сообщение из: ${chatTitle} (тип: ${chatType}, ID: ${chatId})`);

  // Пропускаем личные сообщения
  if (chatType === "private") {
    console.log(`   ⚠️  Это личное сообщение. Отправьте сообщение из канала.\n`);
    return;
  }

  // Показываем информацию о канале/группе
  console.log(`\n✅ Информация о канале/группе:`);
  console.log(`   Название: ${chatTitle}`);
  console.log(`   ID: ${chatId}`);
  console.log(`   Тип: ${chatType}`);
  console.log(`   Username: ${msg.chat.username ? `@${msg.chat.username}` : "Нет"}`);

  // Пытаемся проверить статус бота
  try {
    const member = await bot.getChatMember(chatId, botInfo.id);
    console.log(`   Статус бота: ${member.status}`);
    
    if (member.status === "administrator" || member.status === "creator") {
      console.log(`\n✅ Бот является администратором!`);
    } else {
      console.log(`\n⚠️  Бот НЕ является администратором.`);
      console.log(`   Добавьте бота как администратора в настройках канала.`);
    }
  } catch (error) {
    console.log(`   ⚠️  Не удалось проверить статус бота: ${error.message}`);
    console.log(`   Это нормально, если бот еще не добавлен в канал.`);
  }

  // Показываем ID независимо от статуса
  if (chatType === "channel" || chatType === "supergroup") {
    console.log(`\n📋 Скопируйте этот ID для настройки:`);
    console.log(`   TELEGRAM_CHANNEL_ID=${chatId}`);
    
    if (msg.chat.username) {
      console.log(`\n📋 Или используйте username (если канал публичный):`);
      console.log(`   TELEGRAM_CHANNEL_USERNAME=@${msg.chat.username}`);
    }
    console.log(``);
  }
});

// Команда для ручной проверки
bot.onText(/\/getchannelid/, async (msg) => {
  if (!botInfo) return;
  
  const chatId = msg.chat.id;
  
  // Если команда из личного чата, просим отправить из канала
  if (msg.chat.type === "private") {
    bot.sendMessage(
      msg.from.id,
      "📝 Отправьте эту команду из канала.\n\n" +
      "Или перешлите любое сообщение из канала боту."
    );
    return;
  }
  
  try {
    const chat = await bot.getChat(chatId);
    let memberStatus = "неизвестно";
    
    try {
      const member = await bot.getChatMember(chatId, botInfo.id);
      memberStatus = member.status;
    } catch (e) {
      memberStatus = "бот не в канале";
    }
    
    let response = `✅ Канал/группа найдена!\n\n` +
      `Название: ${chat.title || chat.username || "Без названия"}\n` +
      `ID: \`${chatId}\`\n` +
      `Тип: ${chat.type}\n` +
      `Username: ${chat.username ? `@${chat.username}` : "Нет"}\n` +
      `Статус бота: ${memberStatus}\n\n` +
      `📋 Скопируйте этот ID:\n\`${chatId}\``;
    
    if (chat.username) {
      response += `\n\nИли используйте username:\n\`@${chat.username}\``;
    }
    
    bot.sendMessage(msg.from.id, response, { parse_mode: "Markdown" });
  } catch (error) {
    bot.sendMessage(
      msg.from.id,
      `❌ Ошибка: ${error.message}\n\n` +
      "Попробуйте переслать сообщение из канала боту."
    );
  }
});
