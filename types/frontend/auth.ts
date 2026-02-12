// mbl-paragliding/types/auth.ts
export type User = { username: string };

export type LoginResponse = {
  token: string;
  user: User;
  expiresIn?: string; // ví dụ "7d"
};

export type MeResponse = {
  user: User;
};
