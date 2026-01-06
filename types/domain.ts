export type DbId = string | number;

export type CategoryType = "income" | "expense";

export type FamilyRole = "admin" | "member";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type Category = {
  id: DbId;
  family_id: DbId;
  name: string;
  type: CategoryType;
  amount: number;
  repeats: boolean;
  description: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Budget = {
  id: DbId;
  family_id: DbId;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
};

export type BudgetItem = {
  id: DbId;
  family_id: DbId;
  budget_id: DbId;
  category_id: DbId;
  amount: number;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: DbId;
  family_id: DbId;
  category_id: DbId;
  user_id: string;
  amount: number;
  transaction_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionWithCategory = Transaction & {
  category_name: string;
  category_type: CategoryType;
};

export type Membership = {
  id: DbId;
  family_id: DbId;
  user_id: string;
  role: FamilyRole;
  created_at: string;
  updated_at: string;
};

export type Invitation = {
  id: DbId;
  family_id: DbId;
  email: string;
  token_hash: string;
  invited_by_user_id: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
};
