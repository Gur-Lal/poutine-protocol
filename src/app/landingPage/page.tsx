"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DockStation } from "@/domain/models/DockStation";
import { Bike } from "@/domain/models/Bike";
import { FaXmark } from "react-icons/fa6";
import axios from "axios";
import "../dashboard/dashboard.css";
import "./landingPage.css";

export default function LandingPage() {
    const [stations, setStations] = useState<DockStation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStation, setSelectedStation] = useState<DockStation>();
    const [openViewMenu, setOpenViewMenu] = useState(false);
    const [bikes, setBikes] = useState<Bike[]>([]);

    const router = useRouter();

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

    const fetchBikesByStation = async (stationId: string) => {
        try {
            const response = await axios.get(`/api/getBikes/${stationId}`);
            setBikes(response.data);
        } catch (error) {
            console.log("Error fetching bikes:", error);
        }
    }

    const handleStationClick = (station: DockStation) => {
        setSelectedStation(station);
        setOpenViewMenu(true);
        fetchBikesByStation(station.id);
    }

    const handleCloseViewMenu = () => {
        setOpenViewMenu(false);
        setBikes([]);
        setSelectedStation(undefined);
    }

    const handleLoginOrRegister = (route: string) => {
        router.push(route);
    }

    if (loading) {
        return <p>Loading stations...</p>;
    }

    return (
        <div className="landingContainer">
            <header className="landingHeader">
                <p>Pedal to the MTL</p>
                <div className="navBar">
                    <div className="navOption"> About </div>
                    <div className="navOption"> Pricing </div>
                    <div className="navOption"> Map </div>
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

            <div className="dashboardArea">
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

                <div className="map">
                    {
                        //map goes here in the future
                    }
                </div>
            </div>

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