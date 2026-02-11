"use client"

import { Mail, User, GraduationCap, Clock, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import type { ValidationRequest } from "@/components/types/validation"

interface ValidationRequestCardProps {
  request: ValidationRequest
  onResendClick: (request: ValidationRequest) => void
}

export default function ValidationRequestCard({ 
  request, 
  onResendClick 
}: ValidationRequestCardProps) {
  const isExpired = request.expiresAt 
    ? new Date(request.expiresAt) < new Date()
    : false

  const expiresAt = request.expiresAt 
    ? new Date(request.expiresAt)
    : null

  const acceptedAt = request.acceptedAt
    ? new Date(request.acceptedAt)
    : null

  const getDaysUntilExpiration = () => {
    if (!expiresAt) return null
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const daysUntilExpiration = getDaysUntilExpiration()

  const getExpirationStatusColor = () => {
    if (isExpired) return "text-red-600"
    if (daysUntilExpiration !== null && daysUntilExpiration <= 3) return "text-orange-600"
    return "text-green-600"
  }

  const getExpirationStatusBg = () => {
    if (isExpired) return "bg-red-50 border-red-200"
    if (daysUntilExpiration !== null && daysUntilExpiration <= 3) return "bg-orange-50 border-orange-200"
    return "bg-green-50 border-green-200"
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">{request.studentName}</h3>
            <p className="text-sm text-gray-600 mt-0.5">TUP ID: {request.tupId}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getExpirationStatusBg()} ${getExpirationStatusColor()}`}>
            {isExpired ? (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Expired
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Student Info */}
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4 shrink-0" />
            <span className="truncate">{request.email}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>{request.course} - {request.section}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="pt-3 border-t border-gray-100 space-y-2 text-sm">
          {acceptedAt && (
            <div className="flex items-center gap-2 text-gray-600">
              <CheckCircle className="w-4 h-4 shrink-0 text-green-600" />
              <span>
                Accepted {acceptedAt.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}
          {expiresAt && (
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 shrink-0 ${getExpirationStatusColor()}`} />
              <span className={getExpirationStatusColor()}>
                {isExpired 
                  ? `Expired ${expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : `Expires ${expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${daysUntilExpiration}d)`
                }
              </span>
            </div>
          )}
        </div>

        {/* Last Resend Info */}
        {request.lastQRResent && (
          <div className="pt-3 border-t border-gray-100">
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Last resent by {request.lastQRResent.resentBy} on{' '}
              {new Date(request.lastQRResent.resentAt).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <button
          onClick={() => onResendClick(request)}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Resend QR Code
        </button>
      </div>
    </div>
  )
}