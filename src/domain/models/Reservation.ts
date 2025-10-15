export class Reservation {
  username: string;
  bikeId: string;
  startTime: Date;
  reservationExpiry: Date;
  
  constructor(username: string, bikeId: string, startTime: Date, reservationExpiry: Date) {
    this.username = username;
    this.bikeId = bikeId;
    this.startTime = startTime;
    this.reservationExpiry = reservationExpiry;
  }

  isExpired(): boolean {
    return new Date() > this.reservationExpiry;
  }
}