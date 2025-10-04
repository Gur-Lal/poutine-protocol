// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Welcome to Pedal to the Mtl</h1>
      <p>This is the homepage. Use the links below to log in or register.</p>

      <div style={{ marginTop: "1rem" }}>
        <Link
          href="/login"
          style={{ marginRight: "1rem", color: "blue", textDecoration: "underline" }}
        >
          Login
        </Link>

        <Link
          href="/register"
          style={{ color: "green", textDecoration: "underline" }}
        >
          Register
        </Link>
      </div>
    </main>
  );
}
