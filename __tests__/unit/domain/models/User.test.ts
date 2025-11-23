import { User, Operator, Rider } from '../../../../src/domain/models/User';
import { PricingPlan } from '../../../../src/domain/models/Pricing';

describe('User', () => {
    it('should create a user with username, email, and password', () => {
        const user = new User('john_doe', 'john@example.com', 'password123');

        expect(user.username).toBe('john_doe');
        expect(user.email).toBe('john@example.com');
        expect(user.password).toBe('password123');
    });

    it('should create users with different credentials', () => {
        const user1 = new User('alice', 'alice@test.com', 'pass1');
        const user2 = new User('bob', 'bob@test.com', 'pass2');

        expect(user1.username).not.toBe(user2.username);
        expect(user1.email).not.toBe(user2.email);
        expect(user1.password).not.toBe(user2.password);
    });
});

describe('Operator', () => {
    it('should create an operator with username, email, and password', () => {
        const operator = new Operator('operator1', 'op@example.com', 'securepass');

        expect(operator.username).toBe('operator1');
        expect(operator.email).toBe('op@example.com');
        expect(operator.password).toBe('securepass');
    });

    it('should be an instance of User', () => {
        const operator = new Operator('admin', 'admin@example.com', 'admin123');

        expect(operator).toBeInstanceOf(Operator);
        expect(operator).toBeInstanceOf(User);
    });
});

describe('Rider', () => {
    it('should create a rider with user details and a pricing plan', () => {
        const plan = new PricingPlan('Basic');
        const rider = new Rider('rider1', 'rider@example.com', 'riderpass', plan);

        expect(rider.username).toBe('rider1');
        expect(rider.email).toBe('rider@example.com');
        expect(rider.password).toBe('riderpass');
        expect(rider.currentPlan).toBe(plan);
        expect(rider.currentPlan.name).toBe('Basic');
    });

    it('should be an instance of User', () => {
        const plan = new PricingPlan('Premium');
        const rider = new Rider('cyclist', 'cyclist@example.com', 'pass789', plan);

        expect(rider).toBeInstanceOf(User);
    });

    it('should support different pricing plans', () => {
        const basicPlan = new PricingPlan('Basic');
        const premiumPlan = new PricingPlan('Premium');

        const rider1 = new Rider('user1', 'user1@test.com', 'pass1', basicPlan);
        const rider2 = new Rider('user2', 'user2@test.com', 'pass2', premiumPlan);

        expect(rider1.currentPlan.name).toBe('Basic');
        expect(rider2.currentPlan.name).toBe('Premium');
    });
});