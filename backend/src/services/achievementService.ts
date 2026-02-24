import { prisma } from '../utils/db.js';
import { notificationService } from './notificationService.js';
import { AchievementType } from '@prisma/client';

export const achievementService = {
    /**
     * Award an achievement to a user and notify them.
     */
    awardAchievement: async (userId: string, type: AchievementType, matchId?: string) => {
        try {
            // Check if already awarded (some are one-time, some might be repeatable in future, assume one-time for now)
            const existing = await prisma.achievement.findFirst({
                where: { userId, type }
            });

            if (existing) return existing;

            // Grant
            const achievement = await prisma.achievement.create({
                data: {
                    userId,
                    type,
                    matchId: matchId ?? null
                }
            });

            // Notify
            await notificationService.createNotification({
                userId,
                type: 'ACHIEVEMENT_UNLOCKED',
                title: 'Achievement Unlocked!',
                body: `You have unlocked the ${formatTypeLabel(type)} achievement.`,
                link: '/profile/achievements',
                metadata: { achievementId: achievement.id, type }
            });

            return achievement;
        } catch (error) {
            console.error('[AchievementService] Failed to award achievement:', error);
            return null;
        }
    }
};

function formatTypeLabel(type: string): string {
    return type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}
