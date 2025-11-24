export interface RiderStats {
    missedReservationsLastYear: number;
    allBikesReturned: boolean;
    tripsLastYear: number;
    successfulReservationsLastYear: number;
    tripsPerMonth: number[]; // last 3 months
    tripsPerWeek: number[]; // last 12 weeks
}