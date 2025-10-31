"use client";

import { useState, useEffect } from "react";
import { UserData } from "@/domain/models/UserData";
import { TripData } from "@/domain/models/TripData";
import axios from "axios";

interface TripDataAPI {
  id: string;
  email: string;
  bikeId: string;
  startStationId?: string;
  startStationName: string;
  endStationId?: string;
  endStationName: string;
  startTime: string;  // Dates are strings after JSON conversion
  endTime: string | null;
  status: "active" | "completed";
}

export default function TripHistoryPanel({ email, role }: UserData) {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        let url = "/api/trips";
        if (role === "admin") {
          url = "/api/trips/all";
        } else {
          url = `/api/trips/${email}`;
        }
        const res = await axios.get(url);
        if (res.data.ok) {
          const tripsData: TripData[] = res.data.trips.map((trip: TripDataAPI) => ({
            ...trip,
            startTime: new Date(trip.startTime),
            endTime: trip.endTime ? new Date(trip.endTime) : null,
          }));
          setTrips(tripsData);
        }
      } catch (error) {
        console.error("Error fetching trips:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [email, role]);

  if (loading) return <p>Loading trip history...</p>;
  if (trips.length === 0) return <p>No trips found.</p>;

  return (
    <div className="tripHistoryPanel">
      <h2>Trip History {role === "admin" ? "(All Users)" : ""}</h2>
      <ul>
        {trips.map((trip) => (
          <div key={trip.id} className="tripItem">
            <p><strong>Bike:</strong> {trip.bikeId}</p>
            <p><strong>From:</strong> {trip.startStationName || "N/A"} | <strong>To:</strong> {trip.endStationName || "N/A"}</p>
            <p><strong>Status:</strong> {trip.status.toUpperCase()}</p>
            <p>
              <strong>Start:</strong> {new Date(trip.startTime).toLocaleString()} |{" "}
              <strong>End:</strong> {trip.endTime ? new Date(trip.endTime).toLocaleString() : "Ongoing"}
            </p>
            {trip.endTime && (
              <p>
                <strong>Duration:</strong>{" "}
                {((new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime()) / 60000).toFixed(1)} min
              </p>
            )}
          </div>
        ))}
      </ul>
    </div>
  );
}