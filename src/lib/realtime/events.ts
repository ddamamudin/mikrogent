import { publish } from "./hub";

export const TOPIC = {
  adminTenant: "admin:tenant",
  adminRouter: "admin:router",
  adminLog: "admin:log",
  adminConfig: "admin:config",
  user: (userId: string) => `user:${userId}`,
} as const;

export type AdminLogEntry = {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string | null;
  createdAt: string;
};

export const RT = {
  // Admin tenant list / detail
  tenantUpserted: (id: string) =>
    publish({ topic: TOPIC.adminTenant, event: "tenant.upserted", data: { id } }),
  tenantDeleted: (id: string) =>
    publish({ topic: TOPIC.adminTenant, event: "tenant.deleted", data: { id } }),

  // Admin router list — generic invalidate (router CRUD, status change)
  adminRouterChanged: () =>
    publish({ topic: TOPIC.adminRouter, event: "router.changed", data: null }),

  // Admin activity log — push full row, client prepend tanpa refetch
  adminLog: (entry: AdminLogEntry) =>
    publish({ topic: TOPIC.adminLog, event: "log.created", data: entry }),

  // Global app config update
  configUpdated: () =>
    publish({ topic: TOPIC.adminConfig, event: "config.updated", data: null }),

  // Per-user channel: client subscribe via "user:me" alias (resolved server-side)
  userValidated: (userId: string) =>
    publish({ topic: TOPIC.user(userId), event: "user.validated", data: null }),
  userRouterChanged: (userId: string) =>
    publish({ topic: TOPIC.user(userId), event: "user.router_changed", data: null }),
  userMaxRoutersChanged: (userId: string) =>
    publish({ topic: TOPIC.user(userId), event: "user.max_routers_changed", data: null }),
};
