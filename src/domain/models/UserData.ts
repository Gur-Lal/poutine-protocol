export type Tier = "none" | "bronze" | "silver" | "gold";

export type UserData = {
    email: string,
    role?: "rider" | "operator" | "admin" | "dual";
    activeRole?: "operator" | "rider";
    tier: Tier;
};