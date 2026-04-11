"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface KYCData {
  full_name: string
  phone: string
  date_of_birth: string
  gender: string
  address_line1: string
  address_line2: string
  barangay: string
  city: string
  province: string
  postal_code: string
  zone: string
  id_type: string
  id_number: string
  id_front_url: string
  id_back_url: string
  selfie_url: string
  status?: string
}

export default function KYCPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<Partial<KYCData>>({
    gender: 'prefer_not_to_say',
    id_type: 'national_id',
    city: 'Your City',
    province: 'Your Province',
  })

  useEffect(() => {
    loadExistingData()
  }, [])

  const loadExistingData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/kyc', {
        credentials: 'include',
      })
      const data = await response.json()
      
      if (data.success && data.data) {
        setFormData(data.data)
      }
    } catch (error) {
      console.error('Error loading KYC data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveStepData = async () => {
    try {
      const response = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...formData, step: currentStep + 1 }),
      })
      
      if (!response.ok) throw new Error('Failed to save data')
    } catch (error) {
      console.error('Error saving step:', error)
      throw error
    }
  }

  const handleFileUpload = async (file: File | null, field: string) => {
    if (!file) return ""
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleNext = async () => {
    try {
      await saveStepData()
      
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1)
      } else {
        await submitKYC()
      }
    } catch (error) {
      alert('Error saving data. Please try again.')
    }
  }

  const submitKYC = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/kyc', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('KYC submitted successfully! You will be notified once reviewed.')
        router.push('/dashboard')
      } else {
        alert(data.error || 'Failed to submit KYC')
      }
    } catch (error) {
      alert('Error submitting KYC. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { title: 'Personal Information', icon: 1 },
    { title: 'Address Information', icon: 2 },
    { title: 'ID Document', icon: 3 },
    { title: 'Selfie Verification', icon: 4 },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">KYC Verification</h1>
          <p className="text-gray-600">Complete your identity verification to access all features</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                      index <= currentStep
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index < currentStep ? '✓' : step.icon}
                  </div>
                  <p className={`mt-2 text-sm font-medium ${index <= currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 rounded ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="mt-8">
            {currentStep === 0 && <PersonalInfoStep formData={formData} setFormData={setFormData} />}
            {currentStep === 1 && <AddressStep formData={formData} setFormData={setFormData} />}
            {currentStep === 2 && <IDDocumentStep formData={formData} setFormData={setFormData} handleFileUpload={handleFileUpload} />}
            {currentStep === 3 && <SelfieStep formData={formData} setFormData={setFormData} handleFileUpload={handleFileUpload} />}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : currentStep < 3 ? 'Next' : 'Submit for Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PersonalInfoStep({ formData, setFormData }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
        <input
          type="text"
          value={formData.full_name || ''}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
        <input
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
        <input
          type="date"
          value={formData.date_of_birth || ''}
          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
        <select
          value={formData.gender || 'prefer_not_to_say'}
          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </div>
    </div>
  )
}

function AddressStep({ formData, setFormData }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Address Information</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
        <input
          type="text"
          placeholder="Street, House No."
          value={formData.address_line1 || ''}
          onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
        <input
          type="text"
          placeholder="Apt, Unit, Building"
          value={formData.address_line2 || ''}
          onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
          <input
            type="text"
            value={formData.barangay || ''}
            onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Zone/Purok</label>
          <input
            type="text"
            value={formData.zone || ''}
            onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <input
            type="text"
            value={formData.city || ''}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
          <input
            type="text"
            value={formData.province || ''}
            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
        <input
          type="text"
          value={formData.postal_code || ''}
          onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  )
}

function IDDocumentStep({ formData, setFormData, handleFileUpload }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">ID Document Upload</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ID Type *</label>
        <select
          value={formData.id_type || 'national_id'}
          onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="national_id">National ID</option>
          <option value="drivers_license">Driver's License</option>
          <option value="passport">Passport</option>
          <option value="voters_id">Voter's ID</option>
          <option value="senior_citizen_id">Senior Citizen ID</option>
          <option value="pwd_id">PWD ID</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ID Number *</label>
        <input
          type="text"
          value={formData.id_number || ''}
          onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <FileUploadBox
        label="ID Front Photo *"
        currentValue={formData.id_front_url}
        onChange={async (file) => {
          const base64 = await handleFileUpload(file, 'id_front_url')
          setFormData({ ...formData, id_front_url: base64 })
        }}
      />

      <FileUploadBox
        label="ID Back Photo *"
        currentValue={formData.id_back_url}
        onChange={async (file) => {
          const base64 = await handleFileUpload(file, 'id_back_url')
          setFormData({ ...formData, id_back_url: base64 })
        }}
      />
    </div>
  )
}

function SelfieStep({ formData, setFormData, handleFileUpload }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Selfie Verification</h2>
      
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-blue-900 mb-3">Selfie Guidelines:</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Face the camera directly
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Ensure good lighting
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Remove glasses if possible
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Keep a neutral expression
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            No filters or edits
          </li>
        </ul>
      </div>

      <FileUploadBox
        label="Selfie Photo *"
        currentValue={formData.selfie_url}
        onChange={async (file) => {
          const base64 = await handleFileUpload(file, 'selfie_url')
          setFormData({ ...formData, selfie_url: base64 })
        }}
      />

      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mt-6">
        <p className="text-sm text-orange-800">
          Your data is encrypted and will only be used for verification purposes.
        </p>
      </div>
    </div>
  )
}

function FileUploadBox({ label, currentValue, onChange }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
        {currentValue ? (
          <div className="space-y-4">
            <img src={currentValue} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
            <button
              onClick={() => onChange(null)}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onChange(file)
              }}
              className="hidden"
              id={`upload-${label}`}
            />
            <label htmlFor={`upload-${label}`} className="cursor-pointer">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-semibold text-gray-700 mb-2">Click to upload</p>
              <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
