import { publish } from "./hub";

export const TOPIC = {
  adminTenant: "admin:tenant",
} as const;

export const RT = {
  tenantUpserted: (id: string) =>
    publish({ topic: TOPIC.adminTenant, event: "tenant.upserted", data: { id } }),
  tenantDeleted: (id: string) =>
    publish({ topic: TOPIC.adminTenant, event: "tenant.deleted", data: { id } }),
};
