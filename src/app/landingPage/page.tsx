"use client";

import {useRouter} from 'next/navigation';
import "./landingPage.css";
export default function LandingPage(){
    const router= useRouter();
    const handleLoginOrRegister = (route:string) =>{
        router.push(route);
    }
    return(
        <div>
            <header className="landingHeader">
                <p>Pedal to the MTL</p>
                <div className="navBar">
                    <div className="navOption"> About </div>
                    <div className="navOption"> Pricing </div>
                    <div className="navOption"> Map</div>
                    
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
        </div>
    );
}