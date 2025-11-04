"use client";

import { useState, useEffect, useRef } from "react";
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
  const [filteredTrips, setFilteredTrips] = useState<TripData[]>([]);
  const [searched, setSearched] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
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

  const filterTrips = (tripId?: string, bikeType?: string, startDate?: Date, endDate?: Date) => {
    const filtered = trips.filter((trip) => {

      if(tripId && !trip.id?.toLowerCase().includes(tripId.toLowerCase())){
        return false;
      }

      if(bikeType){
        if(bikeType === "ebike" && !trip.isEBike){
          return false;
        }
        if(bikeType === "regular" && trip.isEBike){
          return false;
        }
      }

      if (startDate && trip.startTime < startDate) {
        return false;
      }

      if(endDate && trip.endTime && trip.endTime > endDate){
        return false;
      }

      return true;
    });
    setFilteredTrips(filtered);
    setSearched(true);
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const tripId = formData.get("tripId") as string;
    const bikeType = formData.get("bikeType") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    filterTrips(tripId || undefined, bikeType || undefined, startDate, endDate);
  };

  const clearSearch = () => {
    setSearched(false);
    setFilteredTrips([]);
    if(formRef.current){
      formRef.current.reset();
    }
  };

  if (loading) return <p>Loading trip history...</p>;
  if (trips.length === 0) return <p>No trips found.</p>;

  const displayTrips = searched ? filteredTrips : trips;

  return (
    <div className="tripHistoryPanel">
      
      <h2>Trip History {role === "admin" ? "(All Users)" : ""}</h2>
      <form ref={formRef} onSubmit={handleSearch}>
        <input type="text" className="searchBar" name="tripId"placeholder="Enter Trip ID"/>

        <select className="searchBar" name="bikeType" defaultValue="">
          <option value="">All Bike Types</option>
          <option value="regular">Regular</option>
          <option value="ebike">E-Bike</option>
        </select>

        <input type="date" name="startDate" placeholder="Start Date"/>
        <input type="date" name="endDate" placeholder="End Date"/>
        <button type="submit">Search</button>
        {searched && <button type="button" onClick={clearSearch}>Clear</button>}
      </form>
      {searched && filteredTrips.length === 0 && <p>No trips match your search criteria.</p>}
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
          {displayTrips.map((trip) => (
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