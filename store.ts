// In-memory store for bot data (resets on restart)
// For persistence across restarts, a DB would be needed

export interface WarnRecord {
  userId: number;
  username: string;
  count: number;
  reasons: string[];
}

export interface NoteRecord {
  name: string;
  content: string;
  createdBy: number;
  createdAt: Date;
}

export interface FilterRecord {
  trigger: string;
  response: string;
}

export interface WelcomeConfig {
  enabled: boolean;
  message: string;
}

export interface ChatConfig {
  warns: Map<number, WarnRecord>;
  notes: Map<string, NoteRecord>;
  filters: Map<string, FilterRecord>;
  welcome: WelcomeConfig;
  lockedTypes: Set<string>;
  antiSpam: boolean;
  maxWarnLimit: number;
}

const chatData = new Map<string | number, ChatConfig>();

export function getChatConfig(chatId: string | number): ChatConfig {
  if (!chatData.has(chatId)) {
    chatData.set(chatId, {
      warns: new Map(),
      notes: new Map(),
      filters: new Map(),
      welcome: { enabled: true, message: "Welcome {mention} to {title}! 🎉" },
      lockedTypes: new Set(),
      antiSpam: false,
      maxWarnLimit: 3,
    });
  }
  return chatData.get(chatId)!;
}

// Global user data
const userBioMap = new Map<number, string>();
export function setUserBio(userId: number, bio: string) { userBioMap.set(userId, bio); }
export function getUserBio(userId: number): string | undefined { return userBioMap.get(userId); }

// User tracking for stats & broadcast
export interface TrackedUser {
  userId: number;
  firstName: string;
  username?: string;
  firstSeen: Date;
  lastSeen: Date;
  monthlyActivity: Map<string, number>; // "YYYY-MM" → message count
}

const trackedUsers = new Map<number, TrackedUser>();

export function trackUser(userId: number, firstName: string, username?: string): void {
  const monthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const existing = trackedUsers.get(userId);
  if (existing) {
    existing.firstName = firstName;
    existing.username = username;
    existing.lastSeen = new Date();
    existing.monthlyActivity.set(monthKey, (existing.monthlyActivity.get(monthKey) ?? 0) + 1);
  } else {
    const activity = new Map<string, number>();
    activity.set(monthKey, 1);
    trackedUsers.set(userId, { userId, firstName, username, firstSeen: new Date(), lastSeen: new Date(), monthlyActivity: activity });
  }
}

export function getMonthlyStats(): { month: string; users: number; messages: number }[] {
  const monthMap = new Map<string, { users: Set<number>; messages: number }>();
  for (const user of trackedUsers.values()) {
    for (const [month, count] of user.monthlyActivity) {
      if (!monthMap.has(month)) monthMap.set(month, { users: new Set(), messages: 0 });
      const entry = monthMap.get(month)!;
      entry.users.add(user.userId);
      entry.messages += count;
    }
  }
  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, users: data.users.size, messages: data.messages }));
}

export function getAllTrackedUsers(): TrackedUser[] {
  return [...trackedUsers.values()];
}

export function getTotalTrackedUsers(): number {
  return trackedUsers.size;
}

// AFKmap
const afkMap = new Map<number, { reason: string; since: Date }>();
export function setAfk(userId: number, reason: string) { afkMap.set(userId, { reason, since: new Date() }); }
export function getAfk(userId: number) { return afkMap.get(userId); }
export function removeAfk(userId: number) { afkMap.delete(userId); }
export function isAfk(userId: number): boolean { return afkMap.has(userId); }
