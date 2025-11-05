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

  const handlePayNow = async () => {
    setLoading(true);
    
    try {
      const response = await fetch("/api/createPaymentSession", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tripId, email }),
      });

      const data = await response.json();

      if (!data.ok || !data.checkoutUrl) {
        throw new Error("Failed to get payment URL");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
      setLoading(false);
    }
  };

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

              <div className="totalRow">
                <span>Total Amount:</span>
                <strong className="totalAmount">${amount.toFixed(2)} CAD</strong>
              </div>
            </div>

            {pricingPlan.toLowerCase() === "monthly" ? (
              <div className="monthlyMessage">
                <p>✓ No charge - Monthly subscription active</p>
                <p className="subtext">This trip is included in your monthly plan</p>
              </div>
            ) : (
              <>
                <div className="paymentInfo">
                  <p>You'll be redirected to Stripe's secure checkout page</p>
                </div>

                <button 
                  onClick={handlePayNow} 
                  className="payButton"
                  disabled={loading}
                >
                  {loading ? "Processing..." : `Pay $${amount.toFixed(2)} CAD`}
                </button>
              </>
            )}

            <button onClick={onClose} className="cancelButton">
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}