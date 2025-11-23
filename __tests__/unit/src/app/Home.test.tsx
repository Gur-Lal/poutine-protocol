import Home from "@/app/page";
import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("Home page", () => {
  it("should redirect to /landingPage", () => {
    Home();
    expect(redirect).toHaveBeenCalledWith("/landingPage");
  });
});

