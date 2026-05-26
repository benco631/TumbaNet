"use client";

import { useState } from "react";
import { auth } from "../../../lib/firebase";

export default function TestAuthPage() {
  const [result, setResult] = useState("");

  const testApi = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        setResult("No user logged in ❌");
        return;
      }

      const token = await user.getIdToken();

      const res = await fetch("/api/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error: unknown) {
      setResult(error instanceof Error ? error.message : "Error");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Test Auth</h1>
      <button onClick={testApi}>Test Protected API</button>
      <pre>{result}</pre>
    </div>
  );
}