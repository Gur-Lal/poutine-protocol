import { createNotification } from "../../../src/domain/services/notificationService";
import { collection, addDoc } from "firebase/firestore";

jest.mock("firebase/firestore", () => ({
    collection: jest.fn(),
    addDoc: jest.fn(),
    serverTimestamp: jest.fn(() => "MOCK_TIMESTAMP"),
}));

jest.mock("@/data/firebase", () => ({
    db: "MOCK_DB",
}));

describe("createNotification", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should call addDoc with correct notification data", async () => {
        const mockCollectionRef = "MOCK_COLLECTION_REF";
        (collection as jest.Mock).mockReturnValue(mockCollectionRef);
        (addDoc as jest.Mock).mockResolvedValue({ id: "123" });

        const logSpy = jest.spyOn(console, "log").mockImplementation();

        await createNotification("test@example.com", "Hello", "World");

        expect(collection).toHaveBeenCalledWith("MOCK_DB", "notifications");

        expect(addDoc).toHaveBeenCalledWith(mockCollectionRef, {
            email: "test@example.com",
            title: "Hello",
            message: "World",
            date: "MOCK_TIMESTAMP",
            isAdminNotification: false,
        });

        expect(logSpy).toHaveBeenCalledWith("Notification sent successfully");
    });

    test("should log an error when addDoc throws", async () => {
        const mockError = new Error("Firestore error");
        (collection as jest.Mock).mockReturnValue("MOCK_REF");
        (addDoc as jest.Mock).mockRejectedValue(mockError);

        const errorSpy = jest.spyOn(console, "error").mockImplementation();

        await createNotification("a", "b", "c");

        expect(errorSpy).toHaveBeenCalledWith(
            "Error sending notification: ",
            mockError
        );
    });
});
