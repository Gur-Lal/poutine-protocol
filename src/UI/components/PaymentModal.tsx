"use client";

import { useState, useEffect } from "react";
import { FaXmark, FaCreditCard, FaClock, FaBicycle } from "react-icons/fa6";
import "./PaymentModal.css";

interface PaymentModalProps {
  isOpen: boolean;
  tripId: string;
  email: string;
  onClose: () => void;
  onPaymentComplete?: () => void;
}

interface PriceBreakdown {
  basePrice: number;
  perMinutePrice: number;
  eBikeSurcharge: number;
  isMonthlySubscription: boolean;
  total: number;
  dualRoleDiscount?: number;
  tierDiscount?: number;
  flexBalanceUsed?: number;
  flexBalanceEarned?: number;
}

export default function PaymentModal({
  isOpen,
  tripId,
  email,
  onClose,
  onPaymentComplete
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [duration, setDuration] = useState<string>("0");
  const [pricingPlan, setPricingPlan] = useState<string>("regular");
  const [error, setError] = useState<string>("");
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");

  useEffect(() => {
    if (isOpen && tripId) {
      initiatePayment();
    }
  }, [isOpen, tripId]);

  const initiatePayment = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/createPaymentSession", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tripId, email }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to create payment session");
      }

      setAmount(data.amount);
      setDuration(data.durationMinutes);
      setPricingPlan(data.pricingPlan);
      setPriceBreakdown(data.priceBreakdown || null);
      setCheckoutUrl(data.checkoutUrl || "");

      // If monthly subscription, skip payment
      if (data.skipPayment) {
        setTimeout(() => {
          onPaymentComplete?.();
          onClose();
        }, 2000);
        return;
      }

      // Don't auto-redirect, wait for user to click "Pay Now"
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = () => {
    if (!checkoutUrl) {
      setError("Payment URL not available");
      return;
    }

      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
  };

  const hasDiscount = priceBreakdown && (priceBreakdown.dualRoleDiscount || priceBreakdown.tierDiscount);

  if (!isOpen) return null;

  return (
    <>
      <div className="paymentModalBackdrop" onClick={onClose}></div>
      <div className="paymentModal">
        <FaXmark className="closeButton" onClick={onClose} />

        <div className="paymentHeader">
          <FaCreditCard className="paymentIcon" />
          <h2>Trip Payment</h2>
        </div>

        {loading ? (
          <div className="loadingContainer">
            <div className="spinner"></div>
            <p>Processing...</p>
          </div>
        ) : error ? (
          <div className="errorContainer">
            <p className="errorText">{error}</p>
            <button onClick={initiatePayment} className="retryButton">
              Try Again
            </button>
          </div>
        ) : (
          <div className="paymentContent">
            <div className="tripSummary">
              <h3>Trip Summary</h3>

              <div className="summaryRow">
                <FaClock className="summaryIcon" />
                <span>Duration:</span>
                <strong>{duration} minutes</strong>
              </div>

              <div className="summaryRow">
                <FaBicycle className="summaryIcon" />
                <span>Plan:</span>
                <strong>{pricingPlan}</strong>
              </div>

              {/* Price Breakdown */}
              {priceBreakdown && !priceBreakdown.isMonthlySubscription && (
                <div
                  style={{
                    marginTop: "20px",
                    paddingTop: "15px",
                    borderTop: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <div className="summaryRow" style={{ fontSize: "14px", opacity: 0.9 }}>
                    <span>Base Price:</span>
                    <span>${priceBreakdown.basePrice.toFixed(2)}</span>
                  </div>
                  <div className="summaryRow" style={{ fontSize: "14px", opacity: 0.9 }}>
                    <span>Per Minute ({duration} min):</span>
                    <span>${priceBreakdown.perMinutePrice.toFixed(2)}</span>
                  </div>
                  {priceBreakdown.eBikeSurcharge > 0 && (
                    <div className="summaryRow" style={{ fontSize: "14px", opacity: 0.9 }}>
                      <span>E-Bike Surcharge:</span>
                      <span>${priceBreakdown.eBikeSurcharge.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Show tier discount */}
                  {priceBreakdown?.tierDiscount && priceBreakdown.tierDiscount > 0 && (
                    <div className="summaryRow" style={{ fontSize: "14px", color: "#4ade80" }}>
                      <span>Tier Discount ({((priceBreakdown.tierDiscount ?? 0) * 100).toFixed(0)}%):</span>
                      <span>Included</span>
                    </div>
                  )}

                  {/* Show dual-role discount */}
                  {priceBreakdown?.dualRoleDiscount && priceBreakdown.dualRoleDiscount > 0 && (
                    <div className="summaryRow" style={{ fontSize: "14px", color: "#4ade80" }}>
                      <span>Dual-Role Discount ({((priceBreakdown.dualRoleDiscount ?? 0) * 100).toFixed(0)}%):</span>
                      <span>Included</span>
                    </div>
                  )}

                  {/* Show flex balance used */}
                  {priceBreakdown?.flexBalanceUsed && priceBreakdown.flexBalanceUsed > 0 && (
                    <div className="summaryRow" style={{ fontSize: "14px", color: "#4ade80" }}>
                      <span>Flex Balance Applied:</span>
                      <span>-${priceBreakdown.flexBalanceUsed.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Show flex balance earned */}
                  {priceBreakdown?.flexBalanceEarned && priceBreakdown.flexBalanceEarned > 0 && (
                    <div 
                      className="summaryRow" 
                      style={{ 
                        fontSize: "14px", 
                        color: "#4ade80",
                        fontWeight: "bold"
                      }}
                    >
                      <span>Flex Balance Earned:</span>
                      <span>+${priceBreakdown.flexBalanceEarned.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="paymentAmount">
              <span>Total Amount:</span>
              <span className="amount">${amount.toFixed(2)}</span>
            </div>

            {priceBreakdown?.isMonthlySubscription ? (
              <div className="monthlyMessage">
                ✓ Included in your monthly subscription
              </div>
            ) : (
              <button onClick={handlePayNow} className="payButton" disabled={loading}>
                {loading ? "Processing..." : "Pay Now"}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}