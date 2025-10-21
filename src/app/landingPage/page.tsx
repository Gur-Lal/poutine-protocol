"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import "./landingPage.css";

export default function LandingPage() {
    const router = useRouter();
    const [currentView, setCurrentView] = useState<'home' | 'pricing'>('home');

    const handleLoginOrRegister = (route: string) => {
        router.push(route);
    }

    if (currentView === 'pricing') {
        return (
            <div>
                <header className="landingHeader">
                    <p>Pedal to the MTL</p>
                    <div className="navBar">
                        <div className="navOption" onClick={() => setCurrentView('home')}> About </div>
                        <div className="navOption activeNav"> Pricing </div>
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

                <main className="pricingPage">
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
            </div>
        );
    }

    return (
        <div>
            <header className="landingHeader">
                <p>Pedal to the MTL</p>
                <div className="navBar">
                    <div className="navOption activeNav"> About </div>
                    <div className="navOption" onClick={() => setCurrentView('pricing')}> Pricing </div>
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