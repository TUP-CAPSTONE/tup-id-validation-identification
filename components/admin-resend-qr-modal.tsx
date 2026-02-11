"use client"

import { useState } from "react"
import { X, Calendar, AlertCircle, Send } from "lucide-react"
import type { ValidationRequest } from "@/components/types/validation"

interface ResendQRModalProps {
  request: ValidationRequest
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ResendQRModal({ 
  request, 
  isOpen, 
  onClose, 
  onSuccess 
}: ResendQRModalProps) {
  const [expirationDays, setExpirationDays] = useState(7)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const calculateNewExpirationDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + expirationDays)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleResend = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/resend-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: request.id,
          expirationDays,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend QR code")
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const currentExpirationDate = request.expiresAt 
    ? new Date(request.expiresAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : "N/A"

  const isExpired = request.expiresAt 
    ? new Date(request.expiresAt) < new Date()
    : false

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Resend Validation QR Code</h2>
            <p className="text-sm text-gray-500 mt-1">Generate and send a new QR code</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Student Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Student Information</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {request.studentName}</p>
              <p><span className="font-medium">TUP ID:</span> {request.tupId}</p>
              <p><span className="font-medium">Email:</span> {request.email}</p>
              <p><span className="font-medium">Course:</span> {request.course} - {request.section}</p>
            </div>
          </div>

          {/* Current Expiration Status */}
          <div className={`border rounded-lg p-4 ${
            isExpired 
              ? 'bg-red-50 border-red-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start gap-3">
              {isExpired && <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Current QR Code Status</h3>
                <p className="text-sm text-gray-600">
                  Expires: <span className={isExpired ? 'text-red-600 font-semibold' : 'font-medium'}>
                    {currentExpirationDate}
                  </span>
                </p>
                {isExpired && (
                  <p className="text-sm text-red-600 font-medium mt-1">
                    ⚠️ This QR code has expired
                  </p>
                )}
                {request.lastQRResent && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last resent by {request.lastQRResent.resentBy} on{' '}
                    {new Date(request.lastQRResent.resentAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Expiration Days Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              New QR Code Expiration Period
            </label>
            <div className="space-y-3">
              <input
                type="range"
                min="1"
                max="30"
                value={expirationDays}
                onChange={(e) => setExpirationDays(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-600">
                  {expirationDays} {expirationDays === 1 ? 'day' : 'days'}
                </span>
                <span className="text-sm text-gray-500">1 - 30 days</span>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">New expiration:</span>{' '}
                  {calculateNewExpirationDate()}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Select
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[7, 14, 21, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => setExpirationDays(days)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    expirationDays === days
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                  disabled={isLoading}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>The current QR code will be invalidated</li>
                  <li>A new QR code will be generated and emailed to the student</li>
                  <li>The student must use the new QR code for validation</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleResend}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Resend QR Code
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}