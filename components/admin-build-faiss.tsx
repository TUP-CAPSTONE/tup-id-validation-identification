"use client"
import { useState } from "react"

export default function AdminBuildFaiss() {
  const [status, setStatus] = useState("Ready")
  const [isBuilding, setIsBuilding] = useState(false)

  const handleBuild = async () => {
    setStatus("🟡 Building FAISS index... Please wait.")
    setIsBuilding(true)

    try {
      const res = await fetch(
        "https://backend-tup-id-validation-identification-production.up.railway.app/build",
        {
          method: "POST",
          headers: {
            "X-Admin-Key": process.env.NEXT_PUBLIC_INDEXER_SECRET || ""
          }
        }
      )

      const data = await res.json()

      if (res.ok) {
        setStatus("✅ " + data.message)
      } else {
        setStatus("❌ " + (data.error || "Unknown error"))
      }
    } catch (error: any) {
      setStatus("❌ Server not reachable")
    } finally {
      setIsBuilding(false)
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Build FAISS Index</h1>

      <button
        onClick={handleBuild}
        disabled={isBuilding}
        className={`px-4 py-2 rounded font-semibold text-white ${
          isBuilding ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {isBuilding ? "Building..." : "Rebuild FAISS Index"}
      </button>

      <div className="mt-4 p-3 border rounded bg-gray-100">
        <strong>Status:</strong> {status}
      </div>
    </div>
  )
}
