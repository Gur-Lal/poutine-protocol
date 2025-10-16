"use client";

import { useState, useEffect } from "react";
import { auth } from "@/data/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { DockStation } from "@/domain/models/DockStation";
import axios from "axios";
import "./dashboard.css"
export default function DashboardPage() {
    const [username, setUsername] = useState("");
    const [stations, setStations] = useState<DockStation[]>([]);
    const [loading, setLoading] = useState(true);
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

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <main className="dashboardContainer">
            <div className="header"></div>
            <div className="dashboardArea"> 
                <div className="stationList">
                    <p className="title">SELECT A STATION</p>
                    {
                        stations.map((station, index)=>(
                            <div className="stationItem" key={index}>
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
        </main>
    );
}
