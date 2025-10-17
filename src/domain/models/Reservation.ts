export class Reservation {
  username: string;
  bikeId: string;
  startTime: Date;
  status: string;
  reservationExpiry: Date;
  
  constructor(username: string, bikeId: string, startTime: Date, reservationExpiry: Date, status: string) {
    this.username = username;
    this.bikeId = bikeId;
    this.startTime = startTime;
    this.status = status;
    this.reservationExpiry = reservationExpiry;
  }

  isExpired(): boolean {
    return new Date() > this.reservationExpiry;
  }
}