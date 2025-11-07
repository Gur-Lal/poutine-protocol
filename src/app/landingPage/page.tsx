"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DockStation } from "@/domain/models/DockStation";
import { Bike } from "@/domain/models/Bike";
import { FaXmark } from "react-icons/fa6";
import axios from "axios";
import "../dashboard/dashboard.css";
import "./landingPage.css";

declare global {
    interface Window {
        google: any;
    }
}
export default function LandingPage() {
    const [stations, setStations] = useState<DockStation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStation, setSelectedStation] = useState<DockStation>();
    const [openViewMenu, setOpenViewMenu] = useState(false);
    const [bikes, setBikes] = useState<Bike[]>([]);
    const [currentTab, setCurrentTab] = useState<"about" | "pricing" | "stations">("about");

    const router = useRouter();

    // Maps
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapReady, setMapReady] = useState(false);

    const handleStationClick = useCallback((station: DockStation) => {
        setSelectedStation(station);
        setOpenViewMenu(true);
        fetchBikesByStation(station.id);
    }, []);

    useEffect(() => {
        const fetchStations = async () => {
            try {
                const response = await axios.get(`api/getDocuments/stations`);
                setStations(response.data);
            } catch (error) {
                console.log("Error fetching stations: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStations();
    }, []);

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

                const fullness = (station.numberOfBikes / station.capacity) * 100;
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

    const fetchBikesByStation = async (stationId: string) => {
        try {
            const response = await axios.get(`/api/getBikes/${stationId}`);
            setBikes(response.data);
        } catch (error) {
            console.log("Error fetching bikes:", error);
        }
    }

    const handleCloseViewMenu = () => {
        setOpenViewMenu(false);
        setBikes([]);
        setSelectedStation(undefined);
    }

    const handleLoginOrRegister = (route: string) => {
        router.push(route);
    }

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
        return <p>Loading stations...</p>;
    }

    return (
        <div className="landingContainer">
            <header className="landingHeader">
                <p>Pedal to the MTL</p>
                <div className="navBar">
                    <div
                        className={`navOption ${currentTab === "about" ? "active" : ""}`}
                        onClick={() => setCurrentTab("about")}
                    >
                        About
                    </div>

                    <div
                        className={`navOption ${currentTab === "pricing" ? "active" : ""}`}
                        onClick={() => setCurrentTab("pricing")}
                    >
                        Pricing
                    </div>

                    <div
                        className={`navOption ${currentTab === "stations" ? "active" : ""}`}
                        onClick={() => setCurrentTab("stations")}
                    >
                        Stations
                    </div>
                </div>
                <div className="buttonMenu">
                    <div>
                        <button className="loginButton" onClick={() => handleLoginOrRegister("/login")}> Log In </button>
                    </div>
                    <div>
                        <button className="registerButton" onClick={() => handleLoginOrRegister("/register")}> Sign Up </button>
                    </div>
                </div>
            </header>

                <main
                    className="pricingPage"
                    style={{ display: currentTab === "pricing" ? "block" : "none" }}
                >
                    <h1 className="pricingPageTitle">Pricing Plans</h1>

                    <div className="pricingContainer">
                        <div className="pricingOption">
                            <h2>Regular Bike</h2>
                            <div className="priceInfo">
                                <p className="basePrice">$2.50 base fee</p>
                                <p className="perMinutePrice">$0.15 per minute</p>
                            </div>
                            <div className="features">
                                <p>Unlimited rides</p>
                                <p>Easy to use</p>
                            </div>
                        </div>

                        <div className="pricingOption">
                            <h2>E-Bike</h2>
                            <div className="priceInfo">
                                <p className="basePrice">$3.50 base fee</p>
                                <p className="perMinutePrice">$0.25 per minute</p>
                            </div>
                            <div className="features">
                                <p>Pedal-assist technology</p>
                                <p>Go further, faster</p>
                            </div>
                        </div>

                        <div className="pricingOption">
                            <h2>Monthly Pass</h2>
                            <div className="priceInfo">
                                <p className="basePrice">$29.99 per month</p>
                                <p className="perMinutePrice">Unlimited 45-min rides</p>
                            </div>
                            <div className="features">
                                <p>Best value for regular riders</p>
                                <p>All bike types included</p>
                            </div>
                        </div>
                    </div>
                </main>

            {currentTab === "about" && (
                <div className="aboutSection">
                    <h1 className="aboutTitle">Ride Freely. Explore Montreal.</h1>
                    <p className="aboutSubtitle">
                        Pedal to the MTL is a community-driven bike share designed for convenience,
                        sustainability, and discovering the city on your own terms.
                    </p>

                    <div className="aboutGif">
                        <img src="/cycling.gif" alt="Cycling animation" />
                    </div>
                    
                    <div className="aboutStats">
                        <div className="statCard">
                            <p className="statNumber">50+</p>
                            <p className="statLabel">Stations Across Montreal</p>
                        </div>
                        <div className="statCard">
                            <p className="statNumber">Zero</p>
                            <p className="statLabel">Emissions</p>
                        </div>
                        <div className="statCard">
                            <p className="statNumber">Infinite</p>
                            <p className="statLabel">Routes to Explore</p>
                        </div>
                    </div>

                    <button
                        className="exploreButton"
                        onClick={() => setCurrentTab("stations")}
                    >
                        Explore Stations
                    </button>
                </div>
            )}

            {currentTab === "stations" && (
                <div className="dashboardArea">
                    <div className="leftPanel">
                        <div className="stationList">
                            <p className="title">AVAILABLE STATIONS</p>
                            {
                                stations.map((station, index) => (
                                    <div className="stationItem" key={index} onClick={() => handleStationClick(station)}>
                                        <p className="title">{station.name.toUpperCase() || "UNNAMED STATION"}</p>
                                        <p className="address">{station.address}</p>
                                        <p className="status" id={station.status === "empty" ? "empty" : station.status === "occupied" ? "occupied" : station.status === "full" ? "full" : "outOfService"}>{station.status.toUpperCase()}</p>
                                        <p className="capacity">Total Capacity: {station.capacity}</p>
                                        <p className="bikesAvailable">Bikes Available: {station.numberOfBikes}</p>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    <div className="mapContainer">
                        <div ref={mapRef} className="map"></div>
                    </div>
                </div>
                )}


            {
                selectedStation && openViewMenu && bikes && (
                    <div>
                        <div className="background" onClick={() => handleCloseViewMenu()}></div>
                        <div className="viewMenu">
                            <FaXmark className="xButton" onClick={() => handleCloseViewMenu()} />
                            <p className="title">VIEW BIKES</p>
                            <p>{selectedStation.name.toUpperCase()}</p>
                            <div className="bikeList">
                                {
                                    bikes.map((bike, index) => (
                                        <div className={`bikeItem ${bike.status === "available" ? 'available' : 'reserved'}`} key={index}>
                                            <p>Bike {index + 1}: {bike.status.toUpperCase()}</p>
                                        </div>
                                    ))
                                }
                            </div>
                            <p className="loginPrompt">Log in to reserve a bike</p>
                        </div>
                    </div>
                )
            }
        </div>
    );
}