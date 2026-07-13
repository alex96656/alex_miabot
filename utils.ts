import TelegramBot from "node-telegram-bot-api";

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

export function formatUserMention(user: TelegramBot.User): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return `[${name}](tg://user?id=${user.id})`;
}

export function isAdmin(
  member: TelegramBot.ChatMember
): boolean {
  return member.status === "administrator" || member.status === "creator";
}

export async function getChatAdmins(
  bot: TelegramBot,
  chatId: number | string
): Promise<TelegramBot.ChatMember[]> {
  try {
    return await bot.getChatAdministrators(chatId);
  } catch {
    return [];
  }
}

export async function isChatAdmin(
  bot: TelegramBot,
  chatId: number | string,
  userId: number
): Promise<boolean> {
  try {
    const member = await bot.getChatMember(chatId, userId);
    return isAdmin(member);
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
