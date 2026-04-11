"use client"

import { useState, useEffect } from 'react'
import AdminHeader from '@/components/admin-header'
import AdminSidebar from '@/components/admin-sidebar'

interface KYCSubmission {
  id: number
  user_id: number
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: string
  address_line1: string
  barangay: string
  city: string
  province: string
  id_type: string
  id_number: string
  id_front_url: string
  id_back_url: string
  selfie_url: string
  status: string
  risk_score: number
  risk_level: string
  submitted_at: string
  reviewed_by: number | null
  reviewed_at: string | null
  rejection_reason: string | null
  admin_notes: string | null
  reviewer_name: string | null
}

export default function AdminKYCPage() {
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'review' | null>(null)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadSubmissions()
  }, [filter])

  const loadSubmissions = async () => {
    setIsLoading(true)
    try {
      const url = filter === 'all' ? '/api/admin/kyc' : `/api/admin/kyc?status=${filter}`
      const response = await fetch(url, { credentials: 'include' })
      const data = await response.json()
      
      if (data.success) {
        setSubmissions(data.data || [])
      }
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedSubmission || !actionType) return

    try {
      const response = await fetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          submission_id: selectedSubmission.id,
          action: actionType,
          reason: actionType === 'reject' ? reason : undefined,
          notes: notes || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`KYC ${actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'moved to review'} successfully!`)
        setShowModal(false)
        setSelectedSubmission(null)
        setReason('')
        setNotes('')
        loadSubmissions()
      } else {
        alert(data.error || 'Failed to perform action')
      }
    } catch (error) {
      alert('Error performing action')
    }
  }

  const openActionModal = (submission: KYCSubmission, action: 'approve' | 'reject' | 'review') => {
    setSelectedSubmission(submission)
    setActionType(action)
    setShowModal(true)
  }

  const filteredSubmissions = submissions

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        <AdminHeader />
        
        <main className="p-8 mt-16">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">KYC Verification Management</h1>
            <p className="text-gray-600">Review and manage user identity verifications</p>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-xl shadow-sm p-1 mb-6 inline-flex">
            {['all', 'submitted', 'under_review', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>

          {/* Submissions List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No submissions found</h3>
              <p className="text-gray-600">There are no KYC submissions matching your filter.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredSubmissions.map((submission) => (
                <div key={submission.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{submission.full_name}</h3>
                          <StatusBadge status={submission.status} />
                          <RiskBadge level={submission.risk_level} score={submission.risk_score} />
                        </div>
                        <p className="text-gray-600">{submission.email}</p>
                        <p className="text-sm text-gray-500">Submitted: {new Date(submission.submitted_at).toLocaleDateString()}</p>
                      </div>
                      
                      {submission.status === 'submitted' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openActionModal(submission, 'approve')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => openActionModal(submission, 'reject')}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                          >
                            ✗ Reject
                          </button>
                          <button
                            onClick={() => openActionModal(submission, 'review')}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                          >
                            ⚠ Review
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Submission Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <InfoItem label="Phone" value={submission.phone} />
                      <InfoItem label="DOB" value={submission.date_of_birth} />
                      <InfoItem label="ID Type" value={submission.id_type?.replace('_', ' ').toUpperCase()} />
                      <InfoItem label="ID Number" value={submission.id_number} />
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Address:</p>
                      <p className="text-sm text-gray-600">
                        {submission.address_line1}, {submission.barangay && `Brgy. ${submission.barangay}, `}
                        {submission.city}, {submission.province}
                      </p>
                    </div>

                    {/* Document Images */}
                    <div className="grid grid-cols-3 gap-4">
                      <DocumentPreview label="ID Front" imageUrl={submission.id_front_url} />
                      <DocumentPreview label="ID Back" imageUrl={submission.id_back_url} />
                      <DocumentPreview label="Selfie" imageUrl={submission.selfie_url} />
                    </div>

                    {/* Review Info */}
                    {submission.reviewed_at && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          Reviewed by: {submission.reviewer_name || 'Admin'} on {new Date(submission.reviewed_at).toLocaleDateString()}
                        </p>
                        {submission.rejection_reason && (
                          <p className="text-sm text-red-600 mt-1">Reason: {submission.rejection_reason}</p>
                        )}
                        {submission.admin_notes && (
                          <p className="text-sm text-gray-600 mt-1">Notes: {submission.admin_notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Action Modal */}
      {showModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {actionType === 'approve' ? '✓ Approve KYC' : actionType === 'reject' ? '✗ Reject KYC' : '⚠ Request Review'}
            </h2>
            
            <p className="text-gray-600 mb-4">
              {selectedSubmission.full_name} - {selectedSubmission.email}
            </p>

            {actionType === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Add any internal notes..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setReason('')
                  setNotes('')
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionType === 'reject' && !reason}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : actionType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: any = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    under_review: 'bg-orange-100 text-orange-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || colors.draft}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  )
}

function RiskBadge({ level, score }: { level: string; score: number }) {
  const colors: any = {
    low: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[level] || colors.low}`}>
      {level.toUpperCase()} RISK ({score})
    </span>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || 'N/A'}</p>
    </div>
  )
}

function DocumentPreview({ label, imageUrl }: { label: string; imageUrl: string }) {
  const [showLarge, setShowLarge] = useState(false)

  return (
    <>
      <div className="text-center">
        <p className="text-xs text-gray-600 mb-2">{label}</p>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            onClick={() => setShowLarge(true)}
            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-500 transition-colors"
          />
        ) : (
          <div className="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <span className="text-gray-400">No image</span>
          </div>
        )}
      </div>

      {showLarge && (
        <div
          onClick={() => setShowLarge(false)}
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 cursor-pointer"
        >
          <img src={imageUrl} alt={label} className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </>
  )
}
