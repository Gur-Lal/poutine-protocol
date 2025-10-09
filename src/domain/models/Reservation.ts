export class Reservation {
  reservationExpiry: Date;

  constructor(reservationExpiry: Date) {
    this.reservationExpiry = reservationExpiry;
  }
}