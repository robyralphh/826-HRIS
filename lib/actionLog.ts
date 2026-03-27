import { prisma } from '@/lib/prisma';

/**
 * Utility to log an action performed by an admin in the HRIS system.
 * 
 * @param userId - The ID of the user performing the action.
 * @param action - A short string categorizing the action (e.g., "CREATE_USER", "DELETE_BRANCH").
 * @param description - A readable description of what happened.
 */
export async function logAdminAction(userId: string | null | undefined, action: string, description: string) {
    if (!userId) {
        console.warn('ActionLog Warning: Attempted to log action without userId:', action, description);
        return;
    }

    try {
        await prisma.actionLog.create({
            data: {
                userId,
                action,
                description,
            }
        });
    } catch (error) {
        // We log the error but don't throw it.
        // Failing to log shouldn't necessarily crash the primary transaction (e.g. creating a user).
        console.error('Failed to create ActionLog:', error);
    }
}
