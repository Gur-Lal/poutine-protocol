import { render, screen, fireEvent } from "@testing-library/react";
import RegisterPage from "../../../../../src/app/register/page";

jest.mock("firebase/auth", () => ({
    createUserWithEmailAndPassword: jest.fn(),
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

jest.mock("next/link", () => {
    return ({ children }: any) => children;
});

window.alert = jest.fn();

describe("RegisterPage", () => {
    test("renders form fields", () => {
        render(<RegisterPage />);

        expect(screen.getByText(/First Name/i)).toBeInTheDocument();
        expect(screen.getByText(/Last Name/i)).toBeInTheDocument();
        expect(screen.getByText(/Address/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Register/i })).toBeInTheDocument();
    });

    test("shows error if required fields are empty", () => {
        render(<RegisterPage />);

        const button = screen.getByRole("button", { name: /Register/i });
        fireEvent.click(button);

        expect(window.alert).not.toHaveBeenCalled();
    });
});
