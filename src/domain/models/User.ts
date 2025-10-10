import { PricingPlan } from './Pricing';

export class User {
  username: string;
  email: string;
  password: string;

  constructor(username: string, email: string, password: string) {
    this.username = username;
    this.email = email;
    this.password = password;
  }
}

export class Operator extends User {
  constructor(username: string, email: string, password: string) {
    super(username, email, password);
  }
}

export class Rider extends User {
  currentPlan: PricingPlan;

  constructor(username: string, email: string, password: string, currentPlan: PricingPlan) {
    super(username, email, password);
    this.currentPlan = currentPlan;
  }
}