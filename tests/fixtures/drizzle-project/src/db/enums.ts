import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'user', 'guest']);
export const postStatusEnum = pgEnum('post_status', ['draft', 'published', 'archived']);
