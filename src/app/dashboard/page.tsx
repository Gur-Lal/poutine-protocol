"use client";

import { useState, useEffect } from "react";
import { auth } from "@/data/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { DockStation } from "@/domain/models/DockStation";
import { Bike } from "@/domain/models/Bike";
import { FaXmark } from "react-icons/fa6";
import { Reservation } from "@/domain/models/Reservation";
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
    const [reservation, setReservation] = useState<Reservation> ();
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
    }, [selectedStation]);
        
    useEffect(() => {
        console.log(selectedBike);
    }, [selectedBike]);
    if (loading) {
        return <p>Loading...</p>;
    }
    
    const fetchBikesByStation = async (stationId:string) => {
        try{
            const response = await axios.get(`/api/getBikes/${stationId}`);
            setBikes(response.data);
        } catch(error){
            console.log("Error fetching bikes:", error);
        }
    }

    const handleStationClick = (station: DockStation) =>{
        setSelectedStation(station);
        setOpenReservationMenu(true);
        fetchBikesByStation(station.id);
    }
    const handleCloseReservationMenu = () => {
        setOpenReservationMenu(false);
        setBikes([]);
        setSelectedStation(undefined);
        setSelectedBike(undefined);
    }
    const handleBikeClick = (bike:Bike) =>{
        if(bike.status === "reserved") {
            return;
        }
        setSelectedBike(bike);
        
    }
    const reserveBike = async (username: string, stationName: string, bikeId: string) =>{
        try{
            const response = await axios.post(`/api/reserveBike`, {
                username: username,
                stationName: stationName,
                bikeId: bikeId
            });
            
            setReservedBikeId(bikeId);
            
        } catch(error){
            console.log("Error reserving bike:", error);
        } finally{ 
            handleCloseReservationMenu();
        }
    }

    const handleViewReservation = async(username: string) => {
        try{
            const response = await axios.get(`/api/getReservation/${username}`);
            const data = response.data;
            if(data){
                const startTime = new Date(data.startTime._seconds * 1000); 
                const reservationExpiry = new Date(data.reservationExpiry._seconds * 1000); 
                
                setReservation({
                    ...data,
                    startTime: startTime,
                    reservationExpiry: reservationExpiry
                });
            } else{
                setReservation(undefined);
            }
        } catch (error){
            console.log("Error fetching reservations.", error);
        } finally{
            setShowReservations(true);
        }
    }

    const unlockBike = async (username: string, bikeId: string) => {
        try{
            const response = await axios.post(`/api/unlockBike`, {
                username: username,
                bikeId: bikeId
            });

            if(response.data.ok){
                alert("Bike unlocked successfully!");
                setShowReservations(false);
                setReservation(undefined);
            } else {
                alert("Failed to unlock bike: " + response.data.error);
            }
        } catch(error) {
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
        } else {
            alert("Failed to return bike: " + response.data.error);
        }
    } catch (error) {
        console.log("Error returning bike:", error);
        alert("Error returning bike");
    }
}
    return (
        <main className="dashboardContainer">
            <div className="header">
                <div className="navBar">
                    <div className="navOption" onClick={()=>handleViewReservation(username)}>View Reservation</div>
                </div>
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
                                <p className="bikesAvailable">Bikes: {station.numberOfBikes}</p>
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
                                <FaXmark className="xButton" onClick={()=> handleCloseReservationMenu()}/>
                                <p className="title">RESERVE or RETURN</p>
                                <p>{selectedStation.name.toUpperCase()}</p>
                                <div className="bikeList">
                                {
                                    bikes.map((bike, index)=>(
                                        <div className={`bikeItem ${selectedBike?.id === bike.id ? 'selected' : ''} ${bike.status === "available" ? 'available' : 'reserved'}`} key={index} onClick={()=> handleBikeClick(bike)}> 
                                            <p>Bike {index + 1}: {bike.status.toUpperCase()}</p>
                                        </div>
                                    ))
                                }
                            </div>
                            <div className="buttons">
                                <button className="actionButton" onClick={() => {
                                        if (!selectedBike) {
                                            alert("Please select a bike");
                                            return;
                                        }
                                        reserveBike(username, selectedStation!.name, selectedBike.id);
                                    }} > RESERVE
                                </button>
                                <button className="actionButton" onClick={() => {
                                    returnBike(username, reservedBikeId, selectedStation.id);
                                }} > RETURN
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showReservations && (
                    <div>
                        <div className="background"></div>
                        <div className="reservation">
                            <FaXmark className="xButton" onClick={()=> setShowReservations(false)}/>
                            {!reservation? (<p>No active reservations</p>):(
                                <div>
                                    
                                    <p className="title">Reservation</p>
                                    <p className="reservationStatus">{reservation.status.toUpperCase()}</p>
                                    <p>Start Time: {reservation.startTime.toLocaleString()}</p>
                                    <p style={{marginBottom: "20px"}}>Expires: {reservation.reservationExpiry.toLocaleString()}</p>
                                    <button className="actionButton" onClick={() => unlockBike(username, reservation.bikeId)}> Unlock Bike</button>
                                    
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </main>
    );
}
