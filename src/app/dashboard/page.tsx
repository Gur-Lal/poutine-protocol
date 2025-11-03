"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/data/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { DockStation } from "@/domain/models/DockStation";
import { Bike } from "@/domain/models/Bike";
import { FaXmark } from "react-icons/fa6";
import { Reservation } from "@/domain/models/Reservation";
import { createNotification } from "@/domain/services/notificationService";
import TripHistoryPanel from "@/UI/components/TripHistoryPanel";
import NotificationButton from "@/UI/components/notification-button";
import axios from "axios";
import { BMSCore, Subscriber, UpdateData } from "@/domain/services/BMSCore";
import "./dashboard.css";

export default function DashboardPage() {
    const [email, setEmail] = useState("");
    // ADDED: Track user ID for publishing reservation updates
    const [userId, setUserId] = useState("");
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
    const [startStation, setStartStation] = useState<DockStation>();

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
        { id: 4, date: "2025-10-01", amount: 15.5, description: "Bike rental - Station A" },
        { id: 5, date: "2025-10-05", amount: 7.0, description: "Bike rental - Station B" },
        { id: 6, date: "2025-10-12", amount: 20.0, description: "Late return fee" },
        { id: 7, date: "2025-10-01", amount: 15.5, description: "Bike rental - Station A" },
        { id: 8, date: "2025-10-05", amount: 7.0, description: "Bike rental - Station B" },
        { id: 9, date: "2025-10-12", amount: 20.0, description: "Late return fee" },
        { id: 10, date: "2025-10-01", amount: 15.5, description: "Bike rental - Station A" }
        
    ];

    const router = useRouter();

    const bmsCore = BMSCore.getInstance();

    const fetchStations = useCallback(async () => {
        try {
            const response = await axios.get(`api/getDocuments/stations`);
            setStations(response.data);
            // ADDED: Publish stations to BMSCore
            bmsCore.publishStations(response.data);
        } catch (error) {
            console.log("Error fetching stations: ", error);
        }
    }, [bmsCore]);

    // ADDED: Subscribe to BMSCore updates for real-time synchronization
    useEffect(() => {
        // Create subscriber to receive updates from BMSCore
        const dashboardSubscriber: Subscriber = {
            update: (data: UpdateData) => {
                switch (data.type) {
                    case 'STATIONS_UPDATE':
                        setStations(data.stations);
                        break;

                    case 'BIKE_UPDATE':
                        if (selectedStation?.id === data.stationId) {
                            setBikes(data.bikes);
                        }
                        break;

                    case 'RESERVATION_UPDATE':
                        fetchStations();
                        break;

                    case 'SYSTEM_UPDATE':
                        // System updates logged to console
                        break;
                }
            }
        };

        // Subscribe with unique ID
        const subscriberId = `dashboard-${Date.now()}`;
        bmsCore.subscribe(subscriberId, dashboardSubscriber);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setEmail(user.email || "");
                // ADDED: Store user ID for publishing reservation updates
                setUserId(user.uid);

                try {
                    // Fetch user role
                    const roleResponse = await axios.get(`/api/getUserRole/${user.uid}`);
                    setUserRole(roleResponse.data.role);

                    const response = await axios.get(`api/getDocuments/stations`);
                    setStations(response.data);
                    // ADDED: Publish stations to BMSCore so all subscribers are notified
                    bmsCore.publishStations(response.data);
                } catch (error) {
                    console.log("Error fetching stations: ", error);
                }
            } else {
                router.push("/login");
            }
            setLoading(false);
        });

        // ADDED: Cleanup function to unsubscribe when component unmounts
        return () => {
            bmsCore.unsubscribe(subscriberId);
            unsubscribe();
        };
    }, [bmsCore, fetchStations, router, selectedStation?.id]);

    useEffect(() => {
        console.log(selectedStation);
    }, [selectedStation]);

    useEffect(() => {
        console.log(selectedBike);
    }, [selectedBike]);

    if (loading) {
        return <p>Loading...</p>;
    }

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
            // ADDED: Publish bike updates to BMSCore
            bmsCore.publishBikes(stationId, response.data);
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

    const reserveBike = async (email: string, stationName: string, bikeId: string) => {
        try {
            const response = await axios.post(`/api/reserveBike`, {
                email: email,
                stationName: stationName,
                bikeId: bikeId
            });
            if (response.data.ok) {
                setReservedBikeId(bikeId);
                await fetchBikeById(bikeId);
                // ADDED: Publish reservation update to all subscribers
                bmsCore.publishReservation(userId, bikeId, 'RESERVED');
                setStartStation(selectedStation);
                await refreshStationAndBikes(selectedStation?.id);
            }
        } catch (error) {
            console.log("Error reserving bike:", error);
        } finally {
            handleCloseReservationMenu();
        }
    }

    const handleViewReservation = async (email: string) => {
        try {
            const response = await axios.get(`/api/getReservation/${email}`);
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
            console.log("Error fetching reservation: ", error);
        } finally {
            setShowReservations(true);
        }
    };

    const unlockBike = async (email: string, bikeId: string, stationId: string, stationName: string) => {
        try {
            const response = await axios.post(`/api/unlockBike`, {
                email: email,
                bikeId: bikeId,
                startStationId: stationId,
                startStationName: stationName
            });
            if (response.data.ok) {
                bmsCore.publishReservation(userId, bikeId, 'UNLOCKED');
                await createNotification(
                    email,
                    "Bike unlocked",
                    "Your bike has been successfully unlocked. Ride safely!"
                );
                setShowReservations(false);
                setReservation(undefined);
                setReservedBikeId("");
                setStartStation(undefined);
                await fetchStations();
            }
        } catch (error) {
            console.log("Error unlocking bike:", error);
        }
    };

    const returnBike = async (email: string, bikeId: string, stationId: string, stationName: string) => {
        try {
            const response = await axios.post(`/api/returnBike`, {
                email: email,
                bikeId: bikeId,
                stationId: stationId,
                stationName: stationName
            });
            if (response.data.ok) {
                bmsCore.publishReservation(userId, bikeId, 'RETURNED');
                await createNotification(
                    email,
                    `Bike returned`,
                    `Your bike has been successfully returned to station: ${selectedStation?.name}`
                );
                setReservedBikeId("");
                setReservation(undefined);
                handleCloseReservationMenu();
                await fetchStations();
            }
        } catch (error) {
            console.log("Error returning bike:", error);
        }
    };

    const handleSetStationService = async (station: DockStation, e: React.MouseEvent) => {
        e.stopPropagation();

        const newStatus = !(station.status === "out_of_service");

        try {
            const response = await axios.post(`/api/admin/setStationService`, {
                stationId: station.id,
                outOfService: newStatus
            });

            if (response.data.ok) {
                alert(`Station ${newStatus ? "marked out of service" : "restored to service"}`);
                bmsCore.publishSystemUpdate(`Station ${station.name} ${newStatus ? "taken offline" : "restored"}`);
                await fetchStations();
            } else {
                alert("Failed to update station status");
            }
        } catch (error) {
            console.error("Error updating station status:", error);
            alert("Error updating station status");
        }
    };

    const handleSetBikeMaintenance = async (bike: Bike) => {
        const newStatus = !(bike.status === "maintenance");

        try {
            const response = await axios.post(`/api/admin/setBikeMaintenance`, {
                bikeId: bike.id,
                inMaintenance: newStatus
            });

            if (response.data.ok) {
                alert(`Bike ${newStatus ? "sent to maintenance" : "returned to service"}`);
                if (selectedStation) {
                    await fetchBikesByStation(selectedStation.id);
                }
                await fetchStations();
            } else {
                alert("Failed to update bike status");
            }
        } catch (error) {
            console.error("Error updating bike status:", error);
            alert("Error updating bike status");
        }
    };

    const handleMoveBike = async () => {
        if (!selectedBike || !selectedStation || !destinationStationId) {
            alert("Please select a destination station");
            return;
        }

        try {
            const response = await axios.post(`/api/admin/moveBike`, {
                bikeId: selectedBike.id,
                sourceStationId: selectedStation.id,
                destinationStationId: destinationStationId
            });

            if (response.data.ok) {
                alert("Bike moved successfully!");
                // ADDED: Publish system update
                bmsCore.publishSystemUpdate(`Bike moved from ${selectedStation.name} to another station`);
                setShowMoveModal(false);
                handleCloseReservationMenu();
                await fetchStations();
            } else {
                alert("Failed to move bike: " + response.data.error);
            }
        } catch (error) {
            console.error("Error moving bike:", error);
            alert("Error moving bike");
        }
    };

    const handleResetSystem = async () => {
        if (!confirm("Are you sure you want to reset the entire system? This will clear all data.")) {
            return;
        }

        try {
            const response = await axios.post(`/api/admin/resetSystem`);

            if (response.data.ok) {
                alert("System reset successfully!");
                // ADDED: Publish system reset
                bmsCore.publishSystemUpdate("System has been reset");
                fetchStations();
            } else {
                alert("Failed to reset system: " + response.data.error);
            }
        } catch (error) {
            console.error("Error resetting system:", error);
            alert("Error resetting system");
        }
    };

    return (
        <main className="dashboardContainer">
            <div className="header">
                <div className="navBar">
                    <div
                        className={`navOption ${currentTab === "stations" ? "active" : ""}`}
                        onClick={() => setCurrentTab("stations")}
                    >
                        Stations
                    </div>
                    {userRole !== "admin" && (
                        <>
                            <div
                                className={`navOption ${currentTab === "trips" ? "active" : ""}`}
                                onClick={() => setCurrentTab("trips")}
                            >
                                Trip History
                            </div>
                            <div
                                className={`navOption ${currentTab === "billing" ? "active" : ""}`}
                                onClick={() => setCurrentTab("billing")}
                            >
                                Billing
                            </div>
                        </>
                    )}

                    {userRole !== "admin" && (
                        <div className="navOption" onClick={() => handleViewReservation(email)}>
                            View Reservation
                        </div>
                    )}
                    {userRole === "admin" && (
                        <div className="navOption adminOption" onClick={handleResetSystem}>
                            Reset System
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <NotificationButton />
                    {userRole === "admin" && (
                        <div className="adminBadge">ADMIN</div>
                    )}
                </div>
            </div>
            <div className="dashboardArea">
                {currentTab === "stations" && (
                    <div>
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
                    <div>
                        <h2 style={{margin:"20px"}}>Billing History</h2>
                        <div className="billingTab">
                        <table className="billingTable">
                            <thead>
                                <tr className="tableHeader">
                                    <th style={{borderTopLeftRadius:"10px"}}>Date</th>
                                    <th>Amount</th>
                                    <th style={{borderTopRightRadius:"10px"}}>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                        {fakeBillings.map((bill) => (
                            <tr key={bill.id} className="billingItem">
                                <td>{bill.date}</td>
                                <td style={{borderLeft: "1px solid white", borderRight: "1px solid white" }}>${bill.amount.toFixed(2)}</td>
                                <td>{bill.description}</td>
                            </tr>
                        ))}
                        </tbody>
                        </table>
                        </div>
                    </div>
                )}

                {currentTab === "trips" && (
                    <TripHistoryPanel email={email} role={userRole} />
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
                                        reserveBike(email, selectedStation!.name, selectedBike.id);
                                    }}
                                        disabled={reservedBikeId !== ""}> RESERVE
                                    </button>
                                    <button className="actionButton" onClick={() => {
                                        returnBike(email, reservedBikeId, selectedStation.id, selectedStation.name);
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
                                    <button className="actionButton" onClick={() => unlockBike(email, reservation.bikeId, startStation!.id, startStation!.name)} disabled={reservedBike?.status === "on_trip"}> Unlock Bike</button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </main>
    );
}