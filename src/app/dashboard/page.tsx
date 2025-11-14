"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { auth } from "@/data/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { DockStation } from "@/domain/models/DockStation";
import { Bike } from "@/domain/models/Bike";
import { FaXmark } from "react-icons/fa6";
import { Reservation } from "@/domain/models/Reservation";
import { createNotification } from "@/domain/services/notificationService";
import TripHistoryPanel from "@/UI/components/TripHistoryPanel";
import NotificationButton from "@/UI/components/NotificationButton";
import PaymentModal from "@/UI/components/PaymentModal";
import BillingHistoryPanel from "@/UI/components/BillingHistoryPanel";
import PricingPanel from "@/UI/components/PricingPanel";
import axios from "axios";
import { clientObserver, ClientSubscriber, ClientUpdateData } from "@/lib/client-observer";
import "./dashboard.css";
import RoleToggle from "@/UI/components/RoleToggle";

declare global {
    interface Window {
        google: any;
    }
}

export default function DashboardPage() {
    const [email, setEmail] = useState("");
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
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentTripId, setPaymentTripId] = useState<string>("");
    const [onBikeTrip, setOnBikeTrip] = useState(false);

    // Admin states
    const [userRole, setUserRole] = useState<"rider" | "operator" | "admin" | "dual">("rider");
    const [activeRole, setActiveRole] = useState<"operator" | "rider">("rider");
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [destinationStationId, setDestinationStationId] = useState("");

    // Tab state 
    const [currentTab, setCurrentTab] = useState<"stations" | "trips" | "billing" | "pricing">("stations");

    // Maps
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapReady, setMapReady] = useState(false);

    const isOperatorMode = () => {
        return userRole === "admin" ||
            userRole === "operator" ||
            (userRole === "dual" && activeRole === "operator");
    };

    const router = useRouter();

    const fetchStations = useCallback(async () => {
        try {
            const response = await axios.get(`api/getDocuments/stations`);
            setStations(response.data);
        } catch (error) {
            console.log("Error fetching stations: ", error);
        }
    }, []);

    const handleStationClick = useCallback((station: DockStation) => {
        setSelectedStation(station);
        setOpenReservationMenu(true);
        fetchBikesByStation(station.id);
    }, []);


    useEffect(() => {
        // Create subscriber to receive updates from BMSCore
        const dashboardSubscriber: ClientSubscriber = {
            update: (data: ClientUpdateData) => {
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
        clientObserver.subscribe(subscriberId, dashboardSubscriber);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setEmail(user.email || "");
                try {
                    // Fetch user role
                    const roleResponse = await axios.get(`/api/activeRole?userId=${user.uid}`);
                    if (roleResponse.data.ok) {
                        setUserRole(roleResponse.data.role);
                        setActiveRole(roleResponse.data.activeRole || "rider");
                    }

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

        // Cleanup function to unsubscribe when component unmounts
        return () => {
            clientObserver.unsubscribe(subscriberId);
            unsubscribe();
        };

    }, [fetchStations, router, selectedStation?.id]);

    useEffect(() => {
        console.log(selectedStation);
    }, [selectedStation]);

    useEffect(() => {
        console.log(selectedBike);
    }, [selectedBike]);

    // Get current location
    useEffect(() => {
        console.log("Location useEffect triggered");
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log("Got user location:", position.coords.latitude, position.coords.longitude);
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.log("Error getting location:", error);
                    console.log("Using default Montreal location");
                    setUserLocation({ lat: 45.5017, lng: -73.5673 });
                }
            );
        } else {
            console.log("No geolocation available, using default");
            setUserLocation({ lat: 45.5017, lng: -73.5673 });
        }
    }, []);

    // Initialize map with async loading
    useEffect(() => {

        if (!userLocation) {
            console.log("No user location yet, waiting...");
            return;
        }

        if (currentTab !== "stations") {
            console.log("Not on stations tab, skipping map init");
            return;
        }

        if (mapInstanceRef.current) {
            console.log("Map already exists, skipping initialization");
            return;
        }

        // Wait for mapRef to be available in the DOM
        const checkMapRef = setInterval(() => {
            if (mapRef.current) {
                console.log("Map ref now available!");
                clearInterval(checkMapRef);

                const initMap = async () => {
                    console.log("Starting map initialization...");

                    // Wait for Google Maps to load
                    if (!window.google?.maps) {
                        console.log("Loading Google Maps script...");
                        try {
                            await new Promise<void>((resolve, reject) => {
                                const script = document.createElement('script');
                                script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
                                script.async = true;
                                script.onload = () => {
                                    console.log("Google Maps script loaded successfully");
                                    resolve();
                                };
                                script.onerror = () => {
                                    console.error("Failed to load Google Maps script");
                                    reject(new Error('Failed to load Google Maps'));
                                };
                                document.head.appendChild(script);
                            });
                        } catch (error) {
                            console.error("Error loading script:", error);
                            return;
                        }
                    } else {
                        console.log("Google Maps already loaded");
                    }

                    if (!mapRef.current) {
                        return;
                    }

                    const map = new window.google.maps.Map(mapRef.current, {
                        center: userLocation,
                        zoom: 13,
                    });

                    mapInstanceRef.current = map;

                    // Add user location marker
                    new window.google.maps.Marker({
                        position: userLocation,
                        map: map,
                        title: "Your Location",
                        icon: {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: "#4285F4",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 2,
                        }
                    });

                    setMapReady(true);
                };


                initMap().catch((error) => {
                    console.error("Map initialization error:", error);
                });
            }
        }, 100);

        const timeout = setTimeout(() => {
            clearInterval(checkMapRef);
        }, 5000);

        return () => {
            clearInterval(checkMapRef);
            clearTimeout(timeout);
        };
    }, [userLocation, currentTab]);

    // Add station markers
    useEffect(() => {
        if (!mapInstanceRef.current) {
            console.log("No map instance yet");
            return;
        }

        if (!window.google?.maps) {
            console.log("Google Maps not loaded yet");
            return;
        }

        if (stations.length === 0) {
            console.log("No stations to display yet");
            return;
        }

        // Clear old markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Add new markers
        stations.forEach((station, index) => {
            if (station.coordinatePosition?.latitude && station.coordinatePosition?.longitude) {
                const marker = new window.google.maps.Marker({
                    position: {
                        lat: station.coordinatePosition.latitude,
                        lng: station.coordinatePosition.longitude
                    },
                    map: mapInstanceRef.current,
                    title: station.name,
                });

                markersRef.current.push(marker);

                const statusColor = getStationColor(station);

                const infoWindow = new window.google.maps.InfoWindow({
                    content: `<div style="color: black; padding: 0; margin: 0; line-height: 1.4;"><span style="background-color: ${statusColor}; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: bold; color: white; display: inline-block;">${station.status.toUpperCase()}</span><br><b>${station.name}</b><br>Capacity: ${station.capacity}<br>Bikes: ${station.numberOfBikes}</div>`,
                    disableAutoPan: true,
                    pixelOffset: new window.google.maps.Size(0, -5)
                });

                // Show on hover
                marker.addListener('mouseover', () => {
                    infoWindow.open(mapInstanceRef.current, marker);
                });

                // Hide window on leave
                marker.addListener('mouseout', () => {
                    infoWindow.close();
                });

                // Click the marker to view the bikes at the station
                marker.addListener('click', () => {
                    handleStationClick(station);
                });

            } else {
                console.log(`${index + 1}. ${station.name} - NO COORDINATES`);
            }
        });

        console.log("Successfully added", markersRef.current.length, "markers");
    }, [stations, mapReady, handleStationClick]);

    const refreshOnBikeTrip = async (email: string) => {
        try {
            const response = await axios.get(`/api/trips/active/${email}`);
            setOnBikeTrip(response.data.trip !== null);
        } catch (error) {
            console.log("Error fetching active trip:", error);
        }
    }

    useEffect(() => {
        if (currentTab !== "stations") {
            // Clear map when leaving stations tab
            if (mapInstanceRef.current) {
                console.log("Leaving stations tab - clearing map");
                mapInstanceRef.current = null;
            }
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];
            setMapReady(false);
        }
    }, [currentTab]);

    useEffect(() => {
        const handlePaymentSuccess = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const paymentStatus = urlParams.get('payment');
            const tripId = urlParams.get('trip');

            if (paymentStatus === 'success' && tripId) {
                console.log('Payment successful for trip:', tripId);

                try {
                    const response = await fetch('/api/markBillingPaid', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ tripId }),
                    });

                    const data = await response.json();

                    if (data.ok) {
                        console.log('Billing marked as paid');
                    }
                } catch (error) {
                    console.error('Error marking billing as paid:', error);
                }

                // Clean up URL
                window.history.replaceState({}, '', '/dashboard');
            }
        };

        handlePaymentSuccess();
    }, [currentTab]);

    const refreshReservation = useCallback(async (email: string) => {
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
        }
    }, []);

    useEffect(() => {
        if (openReservationMenu) {
            refreshOnBikeTrip(email);
            refreshReservation(email);
        }
    }, [email, openReservationMenu, refreshReservation]);

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
        await refreshReservation(email);
        setShowReservations(true);
    };

    const unlockBike = async (email: string, bikeId: string, station: DockStation | undefined) => {
        try {
            if (station === undefined && reservedBike) {
                station = stations.find(st => st.id === reservedBike.stationId);
            }
            const bikeResponse = await axios.get(`/api/getBikeById/${bikeId}`);
            const isEBike = bikeResponse.data.isEBike;
            const response = await axios.post(`/api/unlockBike`, {
                email: email,
                bikeId: bikeId,
                startStationId: station!.id,
                startStationName: station!.name,
                isEBike: isEBike
            });
            if (response.data.ok) {
                await createNotification(
                    email,
                    "Bike unlocked",
                    "Your bike has been successfully unlocked. Ride safely!"
                );
                setShowReservations(false);
                setOnBikeTrip(true);
                await fetchStations();
            }
        } catch (error) {
            console.log("Error unlocking bike:", error);
        }
    };

    const returnBike = async (email: string, bikeId: string, stationId: string) => {
        try {
            const response = await axios.post(`/api/returnBike`, {
                email: email,
                bikeId: bikeId,
                stationId: stationId,
            });

            if (response.data.ok) {
                await createNotification(
                    email,
                    `Bike returned`,
                    `Your bike has been successfully returned to station: ${selectedStation?.name}`
                );
                setReservation(undefined);
                setReservedBikeId("");
                setStartStation(undefined);
                setOnBikeTrip(false);
                handleCloseReservationMenu();
                await fetchStations();

                //  NEW: Show payment modal
                if (response.data.data.tripId) {
                    setPaymentTripId(response.data.data.tripId);
                    setShowPaymentModal(true);
                }
            }
        } catch (error) {
            console.log("Error returning bike:", error);
        }
    };

    const handlePaymentComplete = () => {
        setShowPaymentModal(false);
        setPaymentTripId("");
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
                fetchStations();
            } else {
                alert("Failed to reset system: " + response.data.error);
            }
        } catch (error) {
            console.error("Error resetting system:", error);
            alert("Error resetting system");
        }
    };

    function getStationColor(station: DockStation): string {
        if (!station.capacity || station.capacity === 0) return "gray";
        const fullness = (station.numberOfBikes / station.capacity) * 100;

        if (fullness === 0 || fullness === 100) {
            return "rgb(192, 60, 60)";
        } else if (fullness < 25 || fullness > 85) {
            return "rgb(187, 192, 60)";
        } else {
            return "rgb(97, 192, 60)";
        }
    }

    if (loading) {
        return <p>Loading...</p>;
    }

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
                    <div
                        className={`navOption ${currentTab === "trips" ? "active" : ""}`}
                        onClick={() => setCurrentTab("trips")}
                    >
                        Trip History
                    </div>
                    {userRole !== "admin" && (
                        <>
                            <div
                                className={`navOption ${currentTab === "billing" ? "active" : ""}`}
                                onClick={() => setCurrentTab("billing")}
                            >
                                Billing
                            </div>
                            <div
                                className={`navOption ${currentTab === "pricing" ? "active" : ""}`}
                                onClick={() => setCurrentTab("pricing")}
                            >
                                Pricing
                            </div>
                        </>
                    )}

                    {userRole !== "admin" && (
                        <div className="navOption" onClick={() => handleViewReservation(email)}>
                            View Reservation
                        </div>
                    )}
                    {isOperatorMode() && (
                        <div className="navOption adminOption" onClick={handleResetSystem}>
                            Reset System
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

                    {auth.currentUser && userRole === "dual" && (
                        <RoleToggle
                            user={auth.currentUser}
                            onRoleChange={(newRole) => setActiveRole(newRole)}
                        />
                    )}

                    <NotificationButton />
                    {isOperatorMode() && (
                        <div className="adminBadge">
                            {userRole === "admin" ? "ADMIN" : "OPERATOR"}
                        </div>
                    )}
                </div>
            </div>
            <div className="dashboardArea">
                {currentTab === "stations" && (
                    <>
                        <div className="leftPanel">
                            <div className="stationList">
                                {stations.map((station, index) => (
                                    <div className="stationItem" key={index} onClick={() => handleStationClick(station)}>
                                        <p className="title">{station.name.toUpperCase() || "UNNAMED STATION"}</p>
                                        <p className="address">{station.address}</p>
                                        <p className="status"
                                            style={{
                                                backgroundColor: getStationColor(station),
                                            }}>
                                            {station.status.toUpperCase()}
                                        </p>

                                        <p className="capacity">Total Capacity: {station.capacity}</p>
                                        <p className="bikesAvailable">Bikes: {station.numberOfBikes}</p>

                                        {isOperatorMode() && (
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

                        <div className="mapContainer">
                            <div ref={mapRef} className="map"></div>
                        </div>
                    </>
                )}

                {currentTab === "billing" && (
                    <BillingHistoryPanel email={email} />
                )}

                {currentTab === "trips" && (
                    <TripHistoryPanel
                        email={email}
                        role={userRole}
                        activeRole={activeRole}
                    />
                )}

                {currentTab === "pricing" && (
                    <PricingPanel email={email} />
                )}

            </div>

            {
                selectedStation && openReservationMenu && bikes && (
                    <div>
                        <div className="background"></div>
                        <div className="reservationMenu">
                            <FaXmark className="xButton" onClick={() => handleCloseReservationMenu()} />
                            <p className="title">{isOperatorMode() ? "MANAGE BIKES" : "RESERVE or RETURN"}</p>
                            <p>{selectedStation.name.toUpperCase()}</p>
                            <div className="bikeList">
                                {
                                    bikes.map((bike, index) => (
                                        <div className={`bikeItem ${selectedBike?.id === bike.id ? 'selected' : ''} ${bike.status === "available" ? 'available' : 'reserved'}`} key={index} onClick={() => handleBikeClick(bike)}>
                                            {bike.isEBike ? <p>E-Bike: {bike.status.toUpperCase()}</p> : <p>Regular Bike: {bike.status.toUpperCase()}</p>}
                                            {isOperatorMode() && bike.status !== "on_trip" && bike.status !== "reserved" && (
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

                            {isOperatorMode() ? (
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
                                        returnBike(email, reservedBikeId, selectedStation.id);
                                    }} disabled={!(onBikeTrip)}> RETURN
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
                                    <button className="actionButton" onClick={() => unlockBike(email, reservation.bikeId, startStation)} disabled={reservedBike?.status === "on_trip"}> Unlock Bike</button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {showPaymentModal && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    tripId={paymentTripId}
                    email={email}
                    onClose={() => setShowPaymentModal(false)}
                    onPaymentComplete={handlePaymentComplete}
                />
            )}

        </main>
    );
}