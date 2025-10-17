"use client";

import { useState, useEffect } from "react";
import { auth } from "@/data/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { DockStation } from "@/domain/models/DockStation";
import { Bike } from "@/domain/models/Bike";
import { FaXmark } from "react-icons/fa6";
import axios from "axios";
import "./dashboard.css";

export default function DashboardPage() {
    const [username, setUsername] = useState("");
    const [stations, setStations] = useState<DockStation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStation, setSelectedStation] = useState<DockStation>();
    const [openReservationMenu, setOpenReservationMenu] = useState(false);
    const [bikes, setBikes] = useState<Bike[]>([]);
    const router = useRouter();

    useEffect(()=>{
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if(user){
                setUsername(user.displayName || user.email || "");

                try{
                    const response = await axios.get(`/api/getDocuments/stations`);
                    setStations(response.data);
                } catch (error) {
                    console.log("Error fetching stations:", error);
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
        console.log(bikes);
    }, [selectedStation]);
        
    if (loading) {
        return <p>Loading...</p>;
    }
    
    const fetchBikesByStation = async (stationId:string) => {
        try{
            const response = await axios.get(`/api/getBikes/${stationId}`);
            setBikes(response.data);
        } catch(error){
            console.log("Error fetching docks:", error);
        }
    }

    const handleStationClick = (station: DockStation) =>{
        setSelectedStation(station);
        setOpenReservationMenu(true);
        fetchBikesByStation(station.id);
    }

    return (
        <main className="dashboardContainer">
            <div className="header">
            </div>
            <div className="dashboardArea"> 
                <div className="stationList">
                    <p className="title">SELECT A STATION</p>
                    {
                        stations.map((station, index)=>(
                            <div className="stationItem" key={index} onClick={() => handleStationClick(station)}>
                                <p className="title">{station.name.toUpperCase() || "UNNAMED STATION"}</p>
                                <p className="address">{station.address}</p>
                                <p className="status" id={station.status === "empty" ? "empty": station.status === "occupied"? "occupied" : "full"}>{station.status.toUpperCase()}</p>
                                
                                <p className="capacity">Total Capacity: {station.capacity}</p>
                                <p className="bikesAvailable">Bikes Available: {station.numberOfBikes}</p>
                            </div>
                        ))
                    }
                </div>
                    
                <div className="map">
                    {
                        //map goes here
                    }
                </div>
            </div>

            {
                selectedStation && openReservationMenu && bikes &&(
                    <div>
                        <div className="background"></div>
                            <div className="reservationMenu">
                                <FaXmark className="xButton" onClick={()=>{
                                    setOpenReservationMenu(false);
                                    setBikes([]);
                                }}/>
                                <p className="title">RESERVE A BIKE</p>
                                <p>{selectedStation.name}</p>
                                <div className="bikeList">
                                {
                                    bikes.map((bike, index)=>(
                                        <div className="bikeItem" id={bike.status === "available"? "available":"reserved"}key={index}> 
                                            <p>Bike {index + 1}: {bike.status.toUpperCase()}</p>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                )
            }
        </main>
    );
}
