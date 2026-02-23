import FelixSessionService from './FelixSessionService';
import FelixChatService from './FelixChatService';

/**
 * FelixGreetingService - Generates personalized greetings for Felix
 * 
 * Personalizes greetings based on:
 * - User's name (from displayName)
 * - Time of day (morning, afternoon, evening, late night)
 * - Day of week (Monday-Sunday)
 * - Usage patterns (first time, returning user, power user, etc.)
 */

interface GreetingContext {
  userName: string | null;
  timeOfDay: 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'late-night';
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  usagePattern: 'first-time' | 'first-this-week' | 'returning' | 'power-user' | 'daily-visitor' | 'on-streak' | 'long-time-no-see';
  consecutiveDays?: number;
}

export class FelixGreetingService {
  /**
   * Get personalized greeting for user
   */
  async getGreeting(userId: string, userName: string | null): Promise<string> {
    const context = await this.buildGreetingContext(userId, userName);
    return this.selectGreeting(context);
  }

  /**
   * Build context for greeting selection
   */
  private async buildGreetingContext(userId: string, userName: string | null): Promise<GreetingContext> {
    const now = new Date();
    
    return {
      userName: this.extractFirstName(userName),
      timeOfDay: this.getTimeOfDay(now),
      dayOfWeek: this.getDayOfWeek(now),
      usagePattern: await this.getUsagePattern(userId),
      consecutiveDays: await this.getConsecutiveDays(userId),
    };
  }

  /**
   * Extract first name from display name
   */
  private extractFirstName(displayName: string | null): string | null {
    if (!displayName) return null;
    return displayName.split(' ')[0];
  }

  /**
   * Determine time of day
   */
  private getTimeOfDay(date: Date): GreetingContext['timeOfDay'] {
    const hour = date.getHours();
    
    if (hour >= 5 && hour < 8) return 'early-morning';
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'late-night';
  }

  /**
   * Get day of week
   */
  private getDayOfWeek(date: Date): GreetingContext['dayOfWeek'] {
    const days: GreetingContext['dayOfWeek'][] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  /**
   * Analyze usage pattern
   */
  private async getUsagePattern(userId: string): Promise<GreetingContext['usagePattern']> {
    const sessions = await FelixSessionService.getUserSessions(userId, 30);
    
    if (sessions.length === 0) return 'first-time';
    
    const now = new Date();
    const lastSession = sessions[0];
    const lastActivityDate = lastSession.lastActivityAt.toDate();
    const daysSinceLastActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Long time no see (more than 7 days)
    if (daysSinceLastActivity > 7) return 'long-time-no-see';
    
    // First time this week
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const sessionsThisWeek = sessions.filter(s => s.createdAt.toDate() >= weekStart);
    if (sessionsThisWeek.length === 1) return 'first-this-week';
    
    // Power user (10+ sessions in last 30 days)
    if (sessions.length >= 10) return 'power-user';
    
    // Daily visitor (5+ sessions in last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sessionsLastWeek = sessions.filter(s => s.createdAt.toDate() >= weekAgo);
    if (sessionsLastWeek.length >= 5) return 'daily-visitor';
    
    // Check for streak
    const consecutiveDays = await this.getConsecutiveDays(userId);
    if (consecutiveDays >= 3) return 'on-streak';
    
    return 'returning';
  }

  /**
   * Calculate consecutive days of usage
   */
  private async getConsecutiveDays(userId: string): Promise<number> {
    const sessions = await FelixSessionService.getUserSessions(userId, 30);
    if (sessions.length === 0) return 0;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    let consecutiveDays = 0;
    let checkDate = new Date(now);
    
    for (let i = 0; i < 30; i++) {
      const hasSessionOnDate = sessions.some(s => {
        const sessionDate = s.createdAt.toDate();
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === checkDate.getTime();
      });
      
      if (hasSessionOnDate) {
        consecutiveDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return consecutiveDays;
  }

  /**
   * Select appropriate greeting based on context
   */
  private selectGreeting(context: GreetingContext): string {
    const name = context.userName || 'there';
    
    // Usage-based greetings (highest priority)
    if (context.usagePattern === 'first-time') {
      return `Hey **${name}**! First time here — welcome! I'm genuinely excited to see what we'll figure out together. What brought you in today?`;
    }
    
    if (context.usagePattern === 'long-time-no-see') {
      return `Hey **${name}**! It's been a while — welcome back. A lot may have changed, but I'm still here and ready. What do you need?`;
    }
    
    if (context.usagePattern === 'on-streak' && context.consecutiveDays) {
      return `Day ${context.consecutiveDays} in a row, **${name}**! You're on a roll — let's keep that streak alive. What's today's mission?`;
    }
    
    if (context.usagePattern === 'power-user') {
      return `Back again, **${name}**! You're becoming a regular — I love it. What are we solving today?`;
    }
    
    if (context.usagePattern === 'daily-visitor') {
      return `Hey **${name}**, like clockwork! Love the consistency. You know the drill — what are we working on today?`;
    }
    
    if (context.usagePattern === 'first-this-week') {
      return `Hey **${name}**! Good to see you again this week. Picking up where you left off or starting something fresh?`;
    }
    
    // Day-specific greetings (medium priority)
    const dayGreetings = this.getDaySpecificGreeting(context.dayOfWeek, name);
    if (dayGreetings && Math.random() > 0.5) {
      return dayGreetings;
    }
    
    // Time-based greetings (default)
    return this.getTimeBasedGreeting(context.timeOfDay, name);
  }

  /**
   * Get day-specific greeting
   */
  private getDaySpecificGreeting(day: GreetingContext['dayOfWeek'], name: string): string | null {
    const greetings: Record<GreetingContext['dayOfWeek'], string> = {
      monday: `Monday's here, **${name}**. Deep breath — you've got this. Tell me what we're tackling first and let's make it easier.`,
      tuesday: `Hey **${name}**! Tuesday — the underrated workhorse of the week. Let's keep that Monday momentum going.`,
      wednesday: `Wednesday, **${name}**! You're literally in the middle of the week — it's all downhill from here. What do you need?`,
      thursday: `Thursday already, **${name}**! One more push and the weekend is yours. Let's make today count.`,
      friday: `FRIDAY, **${name}**! Let's get whatever's left off your plate so you can close the week strong. What've you got?`,
      saturday: `Hey **${name}**, didn't expect to see you on a Saturday! Passion project? Catching up? Or just curious? Either way, I'm here.`,
      sunday: `Sunday, **${name}** — the calm before the week. Want to plan ahead, get something done, or just think out loud? I'm down for any of it.`,
    };
    
    return greetings[day];
  }

  /**
   * Get time-based greeting
   */
  private getTimeBasedGreeting(timeOfDay: GreetingContext['timeOfDay'], name: string): string {
    const greetings: Record<GreetingContext['timeOfDay'], string[]> = {
      'early-morning': [
        `Whoa, up early today, **${name}**! The world's still quiet — best time to get ahead. What are we working on?`,
        `Early bird, **${name}**! Grab that coffee and let's make this morning count. What do you need from me today?`,
      ],
      'morning': [
        `Good morning, **${name}**! Hope you slept well. I'm all warmed up and ready — what's first on your list?`,
        `Morning, **${name}**! Looks like you're jumping straight in — no small talk needed. Let's get to it.`,
        `Good morning, **${name}**. No rush today — take your time. I'll be right here whenever you're ready.`,
      ],
      'afternoon': [
        `Afternoon, **${name}**. That post-lunch slowdown is real — let me help you power through the rest of the day.`,
        `Hey **${name}**, halfway through the day already! How's it going — crushing it or need a little backup?`,
        `Good afternoon, **${name}**. Looks like you've got a full plate today — point me at whatever I can take off your hands.`,
        `Hey **${name}**, afternoon is prime time for deep work. Let's make the most of it — what are we diving into?`,
      ],
      'evening': [
        `Evening, **${name}**! Long day? I can keep things light or help you wrap up something — totally your call.`,
        `Good evening, **${name}**. No deadlines here — just you and me. What do you feel like exploring tonight?`,
      ],
      'late-night': [
        `Still going, **${name}**? It's getting late, but honestly the quiet hours hit different. What's on your mind?`,
        `Hey **${name}**, burning the midnight oil again! Some of the best ideas live at this hour. Let's hear it.`,
      ],
    };
    
    const options = greetings[timeOfDay];
    return options[Math.floor(Math.random() * options.length)];
  }
}

export default new FelixGreetingService();
