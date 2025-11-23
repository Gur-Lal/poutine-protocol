import { RiderStats } from "@/domain/models/RiderStats";
import { adminDb } from "@/data/firebaseAdmin";
import { getRiderStats } from "./riderStatsService";
import { Tier } from "../models/UserData";
import { createServerNotification } from "./serverNotificationService";

function qualifiesBronze( r: RiderStats): boolean {
    return (r.missedReservationsLastYear === 0 && r.allBikesReturned === true && r.tripsLastYear >= 10);
}

function qualifiesSilver(r: RiderStats): boolean {
    return (qualifiesBronze(r) && r.successfulReservationsLastYear >= 5 && r.tripsPerMonth.slice(-3).every((m) => m >= 5));
}

function qualifiesGold(r: RiderStats): boolean {
    return (qualifiesSilver(r) && r.tripsPerWeek.slice(-12).every((w) => w >= 5));
}

export function assignTier(r:RiderStats): Tier {
    if(! qualifiesBronze(r)) return "none";
    if(qualifiesGold(r)) return "gold";
    if(qualifiesSilver(r)) return "silver";
    return "bronze";
}

export async function updateRiderTier(email: string): Promise<Tier> {
    const userQuery = await adminDb
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();

    if(userQuery.empty){
        throw new Error(`User with email ${email} not found`);
    }

    const userDoc = userQuery.docs[0];
    const userRef = userDoc.ref;

    const stats = await getRiderStats(email);
    const newTier = assignTier(stats);

    const currentTier = (userDoc.data().tier ?? "none") as Tier;

    if(currentTier !== newTier){
        await userRef.update({tier: newTier});
        await createServerNotification(email, "Tier Update!", `You have been assigned a new tier: ${newTier}`);
    }

    return newTier;
}

export function getTierPerks(tier:Tier){
    switch(tier){
        case "gold":
            return {discount:0.15, extraReservationMinutes: 5};
        case "silver":
            return {discount:0.10, extraReservationMinutes:2};
        case "bronze":
            return {discount: 0.05, extraReservationMinutes: 0};
        default:
            return { discount: 0, extraReservationMinutes: 0};
    }
}