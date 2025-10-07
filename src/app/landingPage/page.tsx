"use client";
import LoginButton from '../../UI/components/LoginButton';
import RegisterButton from '../../UI/components/RegisterButton';
import "./landingPage.css";
export default function LandingPage(){
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
                    <LoginButton/>
                    <RegisterButton/>
                </div>
            </header>
        </div>
    );
}