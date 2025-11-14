import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";

const DUAL_ROLE_DISCOUNT_RATE = 0.10;
const BASE_PRICE = 1.0;
const PER_MINUTE_RATE = 0.05;
const EBIKE_SURCHARGE = 1.0;

export async function POST(request: NextRequest) {
    try {
        const { userId, tripId, email } = await request.json();

        if (!userId || !tripId || !email) {
            return NextResponse.json(
                { ok: false, error: "userId, tripId, and email are required" },
                { status: 400 }
            );
        }

        // Get user role info
        const userDoc = await adminDb.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { ok: false, error: "User not found" },
                { status: 404 }
            );
        }

        const userData = userDoc.data();
        const role = userData?.role || "rider";
        const activeRole = userData?.activeRole || (role === "dual" ? "rider" : role);
        const tierDiscount = userData?.tierDiscount || 0;

        // Get trip info
        const tripDoc = await adminDb.collection("trips").doc(tripId).get();

        if (!tripDoc.exists) {
            return NextResponse.json(
                { ok: false, error: "Trip not found" },
                { status: 404 }
            );
        }

        const tripData = tripDoc.data();

        // Calculate duration
        const startTime = tripData?.startTime?.toDate() || new Date();
        const endTime = tripData?.endTime?.toDate() || new Date();
        const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));

        // Calculate price components
        const basePrice = BASE_PRICE;
        const perMinutePrice = durationMinutes * PER_MINUTE_RATE;
        const eBikeSurcharge = tripData?.isEBike ? EBIKE_SURCHARGE : 0;

        let subtotal = basePrice + perMinutePrice + eBikeSurcharge;

        // Apply tier discount first
        if (tierDiscount > 0) {
            subtotal = subtotal * (1 - tierDiscount);
        }

        // Check if dual-role discount applies
        const isDualRoleDiscount = role === "dual" && activeRole === "rider";

        // Apply dual-role discount on top of tier discount
        if (isDualRoleDiscount) {
            subtotal = subtotal * (1 - DUAL_ROLE_DISCOUNT_RATE);
        }

        const total = Math.round(subtotal * 100) / 100;

        const priceBreakdown = {
            basePrice,
            perMinutePrice,
            eBikeSurcharge,
            isMonthlySubscription: false,
            total,
            dualRoleDiscount: isDualRoleDiscount ? DUAL_ROLE_DISCOUNT_RATE : 0,
            tierDiscount: tierDiscount,
        };

        // Create billing record
        const billingData = {
            userId,
            email,
            tripId,
            amount: total,
            description: `Trip from ${tripData?.startStationName || 'Unknown'} to ${tripData?.endStationName || 'Unknown'}`,
            date: new Date(),
            status: "pending",
            priceBreakdown,
        };

        const billingRef = await adminDb.collection("billings").add(billingData);

        return NextResponse.json({
            ok: true,
            billingId: billingRef.id,
            amount: total,
            priceBreakdown,
            discountsApplied: {
                dualRole: isDualRoleDiscount,
                tier: tierDiscount > 0,
            },
            message: isDualRoleDiscount
                ? "Dual-role discount applied (10%)"
                : "Standard pricing applied",
        });
    } catch (error) {
        console.error("Error calculating billing:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}