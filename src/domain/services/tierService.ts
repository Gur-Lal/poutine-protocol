import { RiderStats } from "@/domain/models/RiderStats";

import { Tier } from "../models/UserData";

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