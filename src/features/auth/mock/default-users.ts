import { UserAccount } from "../types/auth";
import { ROLE_DEFAULT_PERMISSIONS } from "../roles/role-definitions";

export const MOCK_DEFAULT_USERS: UserAccount[] = [
  {
    id: 1,
    username: "admin",
    password: "3215987",
    name: "المدير العام",
    role: "admin",
    assignedGroups: [],
    permissions: ROLE_DEFAULT_PERMISSIONS.admin,
    enabled: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: 2,
    username: "family1",
    password: "family123",
    name: "خادم أسرة الأنبا بولا",
    role: "family",
    assignedGroups: ["الصف السادس - أسرة الأنبا بولا"],
    permissions: ROLE_DEFAULT_PERMISSIONS.family,
    enabled: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: 3,
    username: "family2",
    password: "family456",
    name: "خادم أسرة العذراء مريم",
    role: "family",
    assignedGroups: ["الصف الخامس - أسرة العذراء مريم"],
    permissions: ROLE_DEFAULT_PERMISSIONS.family,
    enabled: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];
