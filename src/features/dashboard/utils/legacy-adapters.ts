import { LegacyGroup, LegacyMember } from "../types/dashboard-types";

export function toLegacyGroup(g: any): LegacyGroup {
  return {
    id: g.id,
    name: g.name,
    grade: g.grade || "",
    active: g.active,
    order: g.sortOrder,
    mainServant: g.mainServant || "",
    assistantServants: g.assistantServants || [],
    servantContact: g.servantContact || "",
  };
}

export function toLegacyMember(m: any): LegacyMember {
  return {
    id: m.id,
    name: m.fullName,
    givenName: m.givenName || "",
    fatherName: m.fatherName || "",
    groupId: m.groupId,
    active: m.active,
    joinedAt: m.joinedAt,
    phone: m.phone || "",
    familyPhone: m.familyPhone || "",
    additionalFamilyPhone: m.additionalFamilyPhone || "",
    address: m.address || "",
    school: m.school || "",
    birthDate: m.birthDate || "",
    brotherOfLord: m.brotherOfLord || false,
    activities: m.activityIds || [],
    notes: m.notes || "",
    archivedAt: m.archivedAt || null,
  };
}
