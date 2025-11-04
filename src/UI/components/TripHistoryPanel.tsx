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
  isEBike: boolean;
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
      <table className = "tripHistoryTable">
        <thead>
          <tr className="tripTableHeader">
            <th>Trip ID</th>
            <th>Rider</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Start Station</th>
            <th>End Station</th>
            <th>Bike Type</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr key={trip.id} className="tripItem">
              <td>{trip.id}</td>
              <td>{trip.email}</td>
              <td>{new Date(trip.startTime).toLocaleString()}</td>
              <td>{new Date(trip.endTime!).toLocaleString()}</td>
              <td>{trip.startStationName}</td>
              <td>{trip.endStationName}</td>
              <td>{trip.isEBike ? "E-Bike" : "Regular"}</td>
              <td> COST </td>
            </tr>
          ))
          }
        </tbody>
      </table>
    </div>
  );
}