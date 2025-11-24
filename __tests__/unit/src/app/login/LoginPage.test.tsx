import { render, screen, fireEvent } from "@testing-library/react";
import LoginPage from "../../../../../src/app/login/page";

jest.mock("firebase/auth", () => ({
    signInWithEmailAndPassword: jest.fn(),
    updateProfile: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
    doc: jest.fn(),
    setDoc: jest.fn(),
    serverTimestamp: jest.fn(),
}));

jest.mock("../../../../../src/data/firebase", () => ({
    auth: {},
    db: {},
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("next/link", () => {
    return ({ children }: any) => children;
});

window.alert = jest.fn();

describe("LoginPage", () => {
    test("renders form fields", () => {
        render(<LoginPage />);

        expect(screen.getByText(/Email address/i)).toBeInTheDocument();
        expect(screen.getByText(/Password/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
    });

    test("shows error if required fields are empty", () => {
        render(<LoginPage />);

        const button = screen.getByRole("button", { name: /Login/i });
        fireEvent.click(button);

        expect(window.alert).toHaveBeenCalledTimes(0);
    });
});