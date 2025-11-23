import { render, screen, waitFor  } from "@testing-library/react";
import NotificationsPage from "../../../../../../src/app/dashboard/notifications/page";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc } from "firebase/firestore";

jest.mock("firebase/auth", () => ({
    onAuthStateChanged: jest.fn(),
    updateProfile: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
    doc: jest.fn(),
    Timestamp: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    onSnapshot: jest.fn(),
    orderBy: jest.fn(),
    deleteDoc: jest.fn(),
    getDoc: jest.fn(),
}));

jest.mock("../../../../../../src/data/firebase", () => ({
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

describe("NotificationsPage", () => {
    test("renders form fields", async () => {
        const unsubscribeMock = jest.fn();

        (onAuthStateChanged as jest.Mock).mockImplementation((authObj, callback) => {
            callback({ uid: "test-user" });
            return unsubscribeMock;
        });

        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({ role: "admin" }),
        });

        render(<NotificationsPage />);

        await waitFor(() => expect(screen.getByText("Notifications")).toBeInTheDocument());
    });
});