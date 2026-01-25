import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const webAppUrl = process.env.WEBAPP_URL;

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Открывай мини-апку 👇", {
    reply_markup: {
      keyboard: [
        [
          {
            text: "Открыть финансы",
            web_app: { url: webAppUrl },
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  });
});

bot.on("polling_error", (err) => {
  console.error("polling_error:", err?.message || err);
});

console.log("Bot is running...");
