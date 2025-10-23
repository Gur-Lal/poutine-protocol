"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface Trip {
  id: string;
  bikeId: string;
  startStationId?: string;
  endStationId?: string;
  startTime: string;
  endTime: string | null;
  status: "active" | "completed";
}

interface TripHistoryPanelProps {
  username: string;
  userRole: string;
}

export default function TripHistoryPanel({ username, userRole }: TripHistoryPanelProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        let url = "/api/trips";
        if (userRole === "admin") {
          url = "/api/trips/all";
        } else {
          url = `/api/trips/${username}`;
        }
        const res = await axios.get(url);
        if (res.data.ok) {
          const tripsData = res.data.trips.map((trip: any) => ({
            ...trip,
            startTime: trip.startTime._seconds
              ? new Date(trip.startTime._seconds * 1000)
              : new Date(trip.startTime),
            endTime: trip.endTime?._seconds
              ? new Date(trip.endTime._seconds * 1000)
              : trip.endTime
              ? new Date(trip.endTime)
              : null,
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
  }, [username, userRole]);

  if (loading) return <p>Loading trip history...</p>;
  if (trips.length === 0) return <p>No trips found.</p>;

  return (
    <div className="tripHistoryPanel">
      <h2>Trip History {userRole === "admin" ? "(All Users)" : ""}</h2>
      <ul>
        {trips.map((trip) => (
          <div key={trip.id} className="tripItem">
            <p><strong>Bike:</strong> {trip.bikeId}</p>
            <p><strong>From:</strong> {trip.startStationId || "N/A"} | <strong>To:</strong> {trip.endStationId || "N/A"}</p>
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