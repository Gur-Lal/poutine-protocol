"use client";

import { useState, useEffect } from "react";
import "../../app/dashboard/dashboard.css";

interface BillingRecord {
  id: string;
  tripId: string;
  amount: number;
  date: string;
  description: string;
  status: "pending" | "paid" | "failed";
  priceBreakdown?: {
    basePrice: number;
    perMinutePrice: number;
    eBikeSurcharge: number;
    isMonthlySubscription: boolean;
    total: number;
  };
}

interface BillingHistoryPanelProps {
  email: string;
}

export default function BillingHistoryPanel({ email }: BillingHistoryPanelProps) {
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBillings = async () => {
      if (!email) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/getBillings?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.ok) {
          setBillings(data.billings);
        } else {
          console.error("Error fetching billings:", data.error);
        }
      } catch (error) {
        console.error("Error fetching billings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillings();
  }, [email]);

  if (loading) return <p style={{ textAlign: "center", padding: "40px" }}>Loading billing history...</p>;
  if (billings.length === 0) return <p style={{ textAlign: "center", padding: "40px" }}>No billing records found.</p>;

  return (
    <div>
      <h2 style={{ margin: "20px" }}>Billing History</h2>
      <div className="billingTab">
        <table className="billingTable">
          <thead>
            <tr className="tableHeader">
              <th style={{ borderTopLeftRadius: "10px" }}>Date</th>
              <th>Trip ID</th>
              <th>Total</th>
              <th>Status</th>
              <th style={{ borderTopRightRadius: "10px" }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {billings.map((bill) => (
              <tr key={bill.id} className="billingItem">
                <td>{new Date(bill.date).toLocaleDateString()}</td>
                <td style={{ borderLeft: "1px solid white", borderRight: "1px solid white", fontFamily: "monospace", fontSize: "12px" }}>
                    {bill.tripId}  
                </td>
                <td style={{ borderRight: "1px solid white" }}>
                  ${bill.amount.toFixed(2)}
                </td>
                <td style={{ borderRight: "1px solid white" }}>
                  <span 
                    style={{
                      padding: "4px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      backgroundColor: 
                        bill.status === "paid" ? "rgba(15, 103, 22, 0.2)" : 
                        bill.status === "pending" ? "rgba(255, 165, 0, 0.2)" : 
                        "rgba(255, 0, 0, 0.2)",
                      color: 
                        bill.status === "paid" ? "#0f6716" : 
                        bill.status === "pending" ? "#ff8c00" : 
                        "#ff0000"
                    }}
                  >
                    {bill.status.toUpperCase()}
                  </span>
                </td>
                <td>{bill.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}