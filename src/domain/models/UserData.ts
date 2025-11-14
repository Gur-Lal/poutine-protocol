export type UserData = {
    email: string,
    role?: "rider" | "operator" | "admin" | "dual";
    activeRole?: "operator" | "rider";
};