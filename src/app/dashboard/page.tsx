"use client";

import { useState, useEffect } from "react";
import { auth } from "@/data/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { DockStation } from "@/domain/models/DockStation";
import { Bike } from "@/domain/models/Bike";
import { FaXmark } from "react-icons/fa6";
import { Reservation } from "@/domain/models/Reservation";
import TripHistoryPanel from "@/UI/components/TripHistoryPanel";
import axios from "axios";
import "./dashboard.css";

export default function DashboardPage() {
    const [username, setUsername] = useState("");
    const [stations, setStations] = useState<DockStation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStation, setSelectedStation] = useState<DockStation>();
    const [openReservationMenu, setOpenReservationMenu] = useState(false);
    const [bikes, setBikes] = useState<Bike[]>([]);
    const [selectedBike, setSelectedBike] = useState<Bike>();
    const [reservedBikeId, setReservedBikeId] = useState("");
    const [showReservations, setShowReservations] = useState(false);
    const [reservation, setReservation] = useState<Reservation>();
    const [reservedBike, setReservedBike] = useState<Bike | null>(null);

    // Admin states
    const [userRole, setUserRole] = useState("");
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [destinationStationId, setDestinationStationId] = useState("");

    // Tab state 
    const [currentTab, setCurrentTab] = useState<"stations" | "trips" | "billing">("stations");

    // Fake billing data
    const fakeBillings = [
        { id: 1, date: "2025-10-01", amount: 15.5, description: "Bike rental - Station A" },
        { id: 2, date: "2025-10-05", amount: 7.0, description: "Bike rental - Station B" },
        { id: 3, date: "2025-10-12", amount: 20.0, description: "Late return fee" },
    ];

    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUsername(user.displayName || user.email || "");

                try {
                    // Fetch user role
                    const roleResponse = await axios.get(`/api/getUserRole/${user.uid}`);
                    setUserRole(roleResponse.data.role);

                    const response = await axios.get(`api/getDocuments/stations`);
                    setStations(response.data);
                } catch (error) {
                    console.log("Error fetching stations: ", error);
                }
            } else {
                router.push("/login");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        console.log(selectedStation);
    }, [selectedStation]);

    useEffect(() => {
        console.log(selectedBike);
    }, [selectedBike]);

    if (loading) {
        return <p>Loading...</p>;
    }

    const fetchStations = async () => {
        try {
            const response = await axios.get(`api/getDocuments/stations`);
            setStations(response.data);
        } catch (error) {
            console.log("Error fetching stations: ", error);
        }
    };

    const refreshStationAndBikes = async (stationId?: string) => {
        await fetchStations();
        if (stationId) {
            await fetchBikesByStation(stationId);
        }
    }

    const fetchBikesByStation = async (stationId: string) => {
        try {
            const response = await axios.get(`/api/getBikes/${stationId}`);
            setBikes(response.data);
        } catch (error) {
            console.log("Error fetching bikes:", error);
        }
    }

    const fetchBikeById = async (bikeId: string) => {
        try {
            const response = await axios.get(`/api/getBikeById/${bikeId}`);
            setReservedBike(response.data);
        } catch (error) {
            console.log("Error fetching bike: ", error);
        }
    }

    const handleStationClick = (station: DockStation) => {
        setSelectedStation(station);
        setOpenReservationMenu(true);
        fetchBikesByStation(station.id);
    }

    const handleCloseReservationMenu = () => {
        setOpenReservationMenu(false);
        setBikes([]);
        setSelectedStation(undefined);
        setSelectedBike(undefined);
        setShowMoveModal(false);
        setDestinationStationId("");
    }

    const handleBikeClick = (bike: Bike) => {
        if (bike.status === "reserved") {
            return;
        }
        setSelectedBike(bike);
    }

    const reserveBike = async (username: string, stationName: string, bikeId: string) => {
        try {
            const response = await axios.post(`/api/reserveBike`, {
                username: username,
                stationName: stationName,
                bikeId: bikeId
            });
            if (response.data.ok) {
                setReservedBikeId(bikeId);
                await fetchBikeById(bikeId);
                await refreshStationAndBikes(selectedStation?.id);
            }
        } catch (error) {
            console.log("Error reserving bike:", error);
        } finally {
            handleCloseReservationMenu();
        }
    }

    const handleViewReservation = async (username: string) => {
        try {
            const response = await axios.get(`/api/getReservation/${username}`);
            const data = response.data;
            if (data) {
                const startTime = new Date(data.startTime._seconds * 1000);
                const reservationExpiry = new Date(data.reservationExpiry._seconds * 1000);

                setReservation({
                    ...data,
                    startTime: startTime,
                    reservationExpiry: reservationExpiry
                });
                setReservedBikeId(data.bikeId);
                await fetchBikeById(data.bikeId);
            } else {
                setReservation(undefined);
                setReservedBikeId("");
                setReservedBike(null);
            }
        } catch (error) {
            console.log("Error fetching reservations.", error);
        } finally {
            setShowReservations(true);
        }
    }

    const unlockBike = async (username: string, bikeId: string) => {
        try {
            const response = await axios.post(`/api/unlockBike`, {
                username: username,
                bikeId: bikeId
            });

            if (response.data.ok) {
                alert("Bike unlocked successfully!");
                setShowReservations(false);
                setReservation(undefined);

                await refreshStationAndBikes(selectedStation?.id);
            } else {
                alert("Failed to unlock bike: " + response.data.error);
            }
        } catch (error) {
            console.log("Error unlocking bike:", error);
            alert("Error unlocking bike");
        }
    }

    const returnBike = async (username: string, bikeId: string, stationId: string) => {
        try {
            const response = await axios.post(`/api/returnBike`, {
                username: username,
                bikeId: bikeId,
                stationId: stationId
            });

            if (response.data.ok) {
                alert("Bike returned successfully!");
                setShowReservations(false);
                setReservation(undefined);
                setReservedBikeId("");
                setReservedBike(null);
                await refreshStationAndBikes(stationId);
            } else {
                alert("Failed to return bike: " + response.data.error);
            }
        } catch (error) {
            console.log("Error returning bike:", error);
            alert("Error returning bike");
        }
    }

    // Admin functions
    const handleMoveBike = async () => {
        if (!selectedBike || !selectedStation || !destinationStationId) {
            alert("Please select a bike and destination station");
            return;
        }

        try {
            const response = await axios.post(`/api/admin/moveBike`, {
                bikeId: selectedBike.id,
                sourceStationId: selectedStation.id,
                destinationStationId: destinationStationId,
            });

            if (response.data.ok) {
                alert("Bike moved successfully!");
                handleCloseReservationMenu();
                fetchStations();
            } else {
                alert("Failed to move bike: " + response.data.error);
            }
        } catch (error) {
            console.log("Error moving bike:", error);
            alert("Error moving bike");
        }
    };

    const handleSetBikeMaintenance = async (bike: Bike) => {
        try {
            const response = await axios.post(`/api/admin/setBikeMaintenance`, {
                bikeId: bike.id,
                inMaintenance: bike.status !== "maintenance",
            });

            if (response.data.ok) {
                alert(`Bike ${bike.status !== "maintenance" ? "sent to" : "removed from"} maintenance successfully!`);
                fetchBikesByStation(selectedStation!.id);
                fetchStations();
            } else {
                alert("Failed to update bike status: " + response.data.error);
            }
        } catch (error) {
            console.log("Error updating bike status:", error);
            alert("Error updating bike status");
        }
    };

    const handleSetStationService = async (station: DockStation, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const response = await axios.post(`/api/admin/setStationService`, {
                stationId: station.id,
                outOfService: station.status !== "out_of_service",
            });

            if (response.data.ok) {
                alert(`Station ${station.status !== "out_of_service" ? "marked as out of service" : "restored to service"}!`);
                fetchStations();
            } else {
                alert("Failed to update station status: " + response.data.error);
            }
        } catch (error) {
            console.log("Error updating station status:", error);
            alert("Error updating station status");
        }
    };

    const handleResetSystem = async () => {
        if (!confirm("Are you sure you want to reset the system to its initial state? This cannot be undone.")) {
            return;
        }

        try {
            const response = await axios.post(`/api/admin/resetSystem`);

            if (response.data.ok) {
                alert("System reset successfully!");
                fetchStations();
            } else {
                alert("Failed to reset system: " + response.data.error);
            }
        } catch (error) {
            console.log("Error resetting system:", error);
            alert("Error resetting system");
        }
    };

    return (
        <main className="dashboardContainer">
            <div className="header">
                <div className="navBar">
                    <div
                        className={`navOption ${currentTab === "trips" ? "activeTab" : ""}`}
                        onClick={() => setCurrentTab("trips")}
                    >
                        Trip History {userRole === "admin" ? "(All Users)" : ""}
                    </div>

                    <div
                        className={`navOption ${currentTab === "stations" ? "activeTab" : ""}`}
                        onClick={() => setCurrentTab("stations")}
                    >
                        Stations & Bikes
                    </div>

                    <div
                        className={`navOption ${currentTab === "billing" ? "activeTab" : ""}`}
                        onClick={() => setCurrentTab("billing")}
                    >
                        Billing
                    </div>

                    {userRole !== "admin" && (
                        <div className="navOption" onClick={() => handleViewReservation(username)}>
                        View Reservation
                        </div>
                    )}
                    {userRole === "admin" && (
                        <div className="navOption adminOption" onClick={handleResetSystem}>
                        Reset System
                        </div>
                    )}
                </div>

                {userRole === "admin" && (
                    <div className="adminBadge">ADMIN</div>
                )}
            </div>
            <div className="dashboardArea">
                {currentTab === "stations" && (
                    <div className="stationsTab">
                        <div className="stationList">
                            {stations.map((station, index) => (
                            <div className="stationItem" key={index} onClick={() => handleStationClick(station)}>
                                <p className="title">{station.name.toUpperCase() || "UNNAMED STATION"}</p>
                                <p className="address">{station.address}</p>
                                <p
                                className="status"
                                id={
                                    station.status === "empty"
                                    ? "empty"
                                    : station.status === "occupied"
                                    ? "occupied"
                                    : station.status === "full"
                                    ? "full"
                                    : "outOfService"
                                }
                                >
                                {station.status.toUpperCase()}
                                </p>

                                <p className="capacity">Total Capacity: {station.capacity}</p>
                                <p className="bikesAvailable">Bikes: {station.numberOfBikes}</p>

                                {userRole === "admin" && (
                                <button
                                    className="adminStationBtn"
                                    onClick={(e) => handleSetStationService(station, e)}
                                >
                                    {station.status === "out_of_service" ? "Restore Service" : "Mark Out of Service"}
                                </button>
                                )}
                            </div>
                            ))}
                        </div>
                    </div>
                )}

                {currentTab === "billing" && (
                    <div className="billingTab">
                        <h2>Billing History</h2>
                        {fakeBillings.map((bill) => (
                            <div key={bill.id} className="billingItem">
                                <p><strong>Date:</strong> {bill.date}</p>
                                <p><strong>Amount:</strong> ${bill.amount.toFixed(2)}</p>
                                <p><strong>Description:</strong> {bill.description}</p>
                                <hr />
                            </div>
                        ))}
                    </div>
                )}

                {currentTab === "trips" && (
                    <div className="tripsTab">
                    <TripHistoryPanel username={username} userRole={userRole} />
                    </div>
                )}
            </div>

            {
                selectedStation && openReservationMenu && bikes && (
                    <div>
                        <div className="background"></div>
                        <div className="reservationMenu">
                            <FaXmark className="xButton" onClick={() => handleCloseReservationMenu()} />
                            <p className="title">{userRole === "admin" ? "MANAGE BIKES" : "RESERVE or RETURN"}</p>
                            <p>{selectedStation.name.toUpperCase()}</p>
                            <div className="bikeList">
                                {
                                    bikes.map((bike, index) => (
                                        <div className={`bikeItem ${selectedBike?.id === bike.id ? 'selected' : ''} ${bike.status === "available" ? 'available' : 'reserved'}`} key={index} onClick={() => handleBikeClick(bike)}>
                                            <p>Bike {index + 1}: {bike.status.toUpperCase()}</p>
                                            {userRole === "admin" && bike.status !== "on_trip" && bike.status !== "reserved" && (
                                                <button
                                                    className="adminBikeAction"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSetBikeMaintenance(bike);
                                                    }}
                                                >
                                                    {bike.status === "maintenance" ? "Remove from Maintenance" : "Send to Maintenance"}
                                                </button>
                                            )}
                                        </div>
                                    ))
                                }
                            </div>

                            {userRole === "admin" ? (
                                <button className="actionButton" onClick={() => {
                                    if (!selectedBike) {
                                        alert("Please select a bike");
                                        return;
                                    }
                                    setShowMoveModal(true);
                                }}> MOVE BIKE
                                </button>
                            ) : (
                                <div className="buttons">
                                    <button className="actionButton" onClick={() => {
                                        if (!selectedBike) {
                                            alert("Please select a bike");
                                            return;
                                        }
                                        reserveBike(username, selectedStation!.name, selectedBike.id);
                                    }}
                                        disabled={reservedBikeId !== ""}> RESERVE
                                    </button>
                                    <button className="actionButton" onClick={() => {
                                        returnBike(username, reservedBikeId, selectedStation.id);
                                    }} disabled={!(reservedBikeId !== "")}> RETURN
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {showMoveModal && selectedBike && selectedStation && (
                <div>
                    <div className="background" onClick={() => setShowMoveModal(false)}></div>
                    <div className="reservation">
                        <FaXmark className="xButton" onClick={() => setShowMoveModal(false)} />
                        <p className="title">MOVE BIKE</p>
                        <p>From: {selectedStation.name}</p>
                        <p>Bike Type: {selectedBike.isEBike ? "E-Bike" : "Standard"}</p>

                        <label className="inputLabel">Select Destination Station:</label>
                        <select
                            value={destinationStationId}
                            onChange={(e) => setDestinationStationId(e.target.value)}
                            className="selectInput"
                        >
                            <option value="">-- Select Station --</option>
                            {stations
                                .filter(s => s.id !== selectedStation?.id && s.status !== "out_of_service")
                                .map(station => (
                                    <option key={station.id} value={station.id}>
                                        {station.name} ({station.numberOfBikes}/{station.capacity})
                                    </option>
                                ))
                            }
                        </select>

                        <button className="actionButton" onClick={handleMoveBike}>
                            MOVE BIKE
                        </button>
                    </div>
                </div>
            )}

            {
                showReservations && (
                    <div>
                        <div className="background"></div>
                        <div className="reservation">
                            <FaXmark className="xButton" onClick={() => setShowReservations(false)} />
                            {!reservation ? (<p>No active reservations</p>) : (
                                <div>
                                    <p className="title">Reservation</p>
                                    <p className="reservationStatus">{reservation.status.toUpperCase()}</p>
                                    <p>Start Time: {reservation.startTime.toLocaleString()}</p>
                                    <p style={{ marginBottom: "20px" }}>Expires: {reservation.reservationExpiry.toLocaleString()}</p>
                                    <button className="actionButton" onClick={() => unlockBike(username, reservation.bikeId)} disabled={reservedBike?.status === "on_trip"}> Unlock Bike</button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </main>
    );
}