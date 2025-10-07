"use client";
import { redirect } from "next/navigation";
import "../style/globals.css";
export default function RegisterButton(){
    return(
        <div>
            <button className="registerButton"> Sign Up </button>
        </div>
    );
}