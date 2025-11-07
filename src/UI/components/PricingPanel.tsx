"use client";

import { useState, useEffect } from "react";
import "@/app/dashboard/dashboard.css";
import "./PricingPanel.css";
import "../../app/dashboard/dashboard.css";

interface PricingPanelProps {
  email: string;
}

export default function PricingPanel({ email }: PricingPanelProps) {
  const [currentPlan, setCurrentPlan] = useState<string>("regular");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        const response = await fetch(`/api/getUserPlan?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.ok) {
          setCurrentPlan(data.pricingPlan || "regular");
        }
      } catch (error) {
        console.error("Error fetching pricing plan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentPlan();
  }, [email]);

  const handlePlanChange = async (newPlan: string) => {
    setUpdating(true);
    try {
      const response = await fetch("/api/updatePricingPlan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, pricingPlan: newPlan }),
      });

      const data = await response.json();

      if (data.ok) {
        setCurrentPlan(newPlan);
        alert("Pricing plan updated successfully!");
      } else {
        alert("Failed to update pricing plan: " + data.error);
      }
    } catch (error) {
      console.error("Error updating pricing plan:", error);
      alert("Failed to update pricing plan");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p style={{ textAlign: "center", padding: "40px" }}>Loading pricing plans...</p>;

  return (
    <div className="pricingPanel">
      <h2>Choose Your Pricing Plan</h2>
      
      <div className="pricingCards">
        {/* Regular Plan */}
        <div className={`pricingCard ${currentPlan === "regular" ? "active" : ""}`}>
          <div className="planHeader">
            <h3>Regular Plan</h3>
            <p className="planPrice">Pay as you go</p>
          </div>
          <div className="planFeatures">
            <p>✓ $1.50 base fee</p>
            <p>✓ $0.10 per minute</p>
            <p>✓ E-Bike: +$1.00 surcharge</p>
            <p>✓ E-Bike: $0.15 per minute</p>
          </div>
          <button
            className={`selectButton ${currentPlan === "regular" ? "selected" : ""}`}
            onClick={() => handlePlanChange("regular")}
            disabled={currentPlan === "regular" || updating}
          >
            {currentPlan === "regular" ? "Current Plan" : "Select Plan"}
          </button>
        </div>

        {/* Monthly Plan */}
        <div className={`pricingCard ${currentPlan === "monthly" ? "active" : ""}`}>
          <div className="planHeader">
            <h3>Monthly Plan</h3>
            <p className="planPrice">$30/month</p>
          </div>
          <div className="planFeatures">
            <p>✓ Unlimited rides</p>
            <p>✓ No per-minute charges</p>
            <p>✓ Free E-Bike access</p>
            <p>✓ Best value for frequent riders</p>
          </div>
          <button
            className={`selectButton ${currentPlan === "monthly" ? "selected" : ""}`}
            onClick={() => handlePlanChange("monthly")}
            disabled={currentPlan === "monthly" || updating}
          >
            {currentPlan === "monthly" ? "Current Plan" : "Select Plan"}
          </button>
        </div>
      </div>

      {updating && <p className="updatingMessage">Updating your plan...</p>}
    </div>
  );
}