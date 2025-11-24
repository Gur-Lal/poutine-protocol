import { RiderStats } from "../models/RiderStats";
import { adminDb } from "@/data/firebaseAdmin";

// helper to parse date into YYYY-MM
const monthKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

// helper to parse date into YYY-W
function weekKey(date: Date): string {
    const _date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = _date.getUTCDay() || 7;
    _date.setUTCDate(_date.getUTCDate() + 4 - dayNum);

    const week = Math.ceil(
        ((_date.getTime() - Date.UTC(_date.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7
    );

    return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function getRiderStats(email: string): Promise<RiderStats> {
    const now = new Date();
    const lastYear = new Date();
    lastYear.setFullYear(now.getFullYear() - 1);

    const reservationSnap = await adminDb
    .collection("reservations")
    .where("email", "==", email)
    .get();

    let missedReservationsLastYear = 0;
    let successfulReservationsLastYear = 0;

    reservationSnap.forEach((doc) => {
        const data = doc.data();
        const start = data.startTime.toDate();
        const status: string = data.status;

        if(start >= lastYear) {
            if(status === "expired") missedReservationsLastYear++;
            if(status === "completed") {
                successfulReservationsLastYear++;
            }
        }
    });

    const tripSnap = await adminDb
    .collection("trips")
    .where("email", "==", email)
    .get();

    let tripsLastYear = 0;
    let allBikesReturned = true;
    const MAX_ACTIVE_TRIP_HOURS = 6;

    const monthCountMap = new Map<string,  number>();
    const weekCountMap = new Map<string, number> ();

    tripSnap.forEach((doc) => {
        const data = doc.data();
        const start = data.startTime.toDate();
        const end = data.endTime ? data.endTime.toDate() : null;

        if(start >= lastYear) {
            tripsLastYear++;
        }

        if(!end) {
            const hoursActive = (now.getTime() - start.getTime()) / (1000 * 60 *60);
            if(hoursActive > MAX_ACTIVE_TRIP_HOURS){
                allBikesReturned = false;
            }
        }

        const mKey = monthKey(start);
        monthCountMap.set(mKey, (monthCountMap.get(mKey) ?? 0) + 1);

        const wKey = weekKey(start);
        weekCountMap.set(wKey, (weekCountMap.get(wKey) ?? 0 ) + 1);
    });

    const tripsPerMonth: number[] = [];
    for(let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = monthKey(d);
        tripsPerMonth.push(monthCountMap.get(key) ?? 0);
    }

    const tripsPerWeek: number[] = [];
    for(let i = 11; i >= 0; i--){
        const d = new Date(now);
        d.setDate(now.getDate() - i *7);
        const key = weekKey(d);
        tripsPerWeek.push(weekCountMap.get(key) ?? 0);
    }

    return {
        missedReservationsLastYear,
        allBikesReturned,
        tripsLastYear,
        successfulReservationsLastYear,
        tripsPerMonth,
        tripsPerWeek,
    };
}