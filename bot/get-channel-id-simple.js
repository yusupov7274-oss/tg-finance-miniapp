import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

console.log("🔍 Получаю информацию о каналах...\n");

// Простой способ: переслать сообщение из канала боту
bot.on("message", async (msg) => {
  // Проверяем, переслано ли сообщение из канала
  if (msg.forward_from_chat) {
    const chat = msg.forward_from_chat;
    console.log("✅ Найден канал из пересланного сообщения:");
    console.log(`   Название: ${chat.title || chat.username || "Без названия"}`);
    console.log(`   ID: ${chat.id}`);
    console.log(`   Тип: ${chat.type}`);
    console.log(`   Username: ${chat.username ? `@${chat.username}` : "Нет"}`);
    console.log(`\n📋 Скопируйте этот ID:`);
    console.log(`   TELEGRAM_CHANNEL_ID=${chat.id}`);
    if (chat.username) {
      console.log(`\n📋 Или используйте username:`);
      console.log(`   TELEGRAM_CHANNEL_USERNAME=@${chat.username}`);
    }
    console.log(``);
    process.exit(0);
  }
  
  // Если сообщение из канала напрямую
  if (msg.chat.type === "channel" || msg.chat.type === "supergroup") {
    console.log("✅ Найден канал:");
    console.log(`   Название: ${msg.chat.title || msg.chat.username || "Без названия"}`);
    console.log(`   ID: ${msg.chat.id}`);
    console.log(`   Тип: ${msg.chat.type}`);
    console.log(`   Username: ${msg.chat.username ? `@${msg.chat.username}` : "Нет"}`);
    console.log(`\n📋 Скопируйте этот ID:`);
    console.log(`   TELEGRAM_CHANNEL_ID=${msg.chat.id}`);
    if (msg.chat.username) {
      console.log(`\n📋 Или используйте username:`);
      console.log(`   TELEGRAM_CHANNEL_USERNAME=@${msg.chat.username}`);
    }
    console.log(``);
    process.exit(0);
  }
});

// Команда для получения ID
bot.onText(/\/getid/, async (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  
  if (chatType === "private") {
    bot.sendMessage(
      chatId,
      "📝 Отправьте эту команду из канала.\n\n" +
      "Или перешлите любое сообщение из канала боту."
    );
    return;
  }
  
  try {
    const chat = await bot.getChat(chatId);
    let response = `✅ ID канала/группы:\n\n` +
      `Название: ${chat.title || chat.username || "Без названия"}\n` +
      `ID: \`${chat.id}\`\n` +
      `Тип: ${chat.type}\n` +
      `Username: ${chat.username ? `@${chat.username}` : "Нет"}\n\n` +
      `📋 Скопируйте ID:\n\`${chat.id}\``;
    
    if (chat.username) {
      response += `\n\nИли username:\n\`@${chat.username}\``;
    }
    
    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
  }
});

bot.startPolling().then(() => {
  console.log("✅ Бот запущен");
  console.log("\n📝 Способы получить Channel ID:");
  console.log("   1. Перешлите сообщение из канала боту @lmyfinancel_bot");
  console.log("   2. Отправьте команду /getid из канала боту");
  console.log("   3. Отправьте любое сообщение в канал (если бот там есть)\n");
  console.log("⏳ Ожидаю...\n");
}).catch((err) => {
  console.error("❌ Ошибка запуска бота:", err.message);
  process.exit(1);
});
