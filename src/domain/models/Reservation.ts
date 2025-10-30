export class Reservation {
  email: string;
  bikeId: string;
  startTime: Date;
  status: string;
  reservationExpiry: Date;
  
  constructor(email: string, bikeId: string, startTime: Date, reservationExpiry: Date, status: string) {
    this.email = email;
    this.bikeId = bikeId;
    this.startTime = startTime;
    this.status = status;
    this.reservationExpiry = reservationExpiry;
  }

  isExpired(): boolean {
    return new Date() > this.reservationExpiry;
  }
}