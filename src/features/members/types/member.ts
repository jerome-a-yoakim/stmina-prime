export interface Member {
  id: string;
  groupId: string;
  fullName: string;
  givenName: string | null;
  fatherName: string | null;
  phone: string | null;
  familyPhone: string | null;
  additionalFamilyPhone: string | null;
  address: string | null;
  school: string | null;
  birthDate: string | null;
  notes: string | null;
  active: boolean;
  joinedAt: string;
  brotherOfLord: boolean;
  archivedAt: string | null;
  activityIds: string[];
}
