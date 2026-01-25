import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const webAppUrl = process.env.WEBAPP_URL;

// Проверка переменных окружения
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN не установлен в .env файле!");
  process.exit(1);
}

if (!webAppUrl) {
  console.error("❌ WEBAPP_URL не установлен в .env файле!");
  process.exit(1);
}

console.log("✅ Бот запущен");
console.log(`📱 Web App URL: ${webAppUrl}`);

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Используем inline keyboard для более надежной работы
  bot.sendMessage(chatId, "💰 Личные финансы\n\nОткройте приложение для управления вашими финансами 👇", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📊 Открыть приложение",
            web_app: { url: webAppUrl },
          },
        ],
      ],
    },
  });
});

// Команда /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "📖 Доступные команды:\n\n/start - Открыть приложение\n/help - Показать справку");
});

bot.on("polling_error", (err) => {
  console.error("polling_error:", err?.message || err);
});

console.log("Bot is running...");
