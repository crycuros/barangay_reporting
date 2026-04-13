"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PhoneInput } from "react-international-phone"
import "react-international-phone/style.css"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"

// Custom styles to make flags larger and style date picker
const customStyles = `
  .react-international-phone-country-selector button img {
    width: 24px !important;
    height: 18px !important;
  }
  .react-international-phone-country-selector-dropdown img {
    width: 24px !important;
    height: 18px !important;
  }
  .rdp-root {
    --rdp-accent-color: #000000 !important;
    --rdp-accent-background-color: #f5f5f5 !important;
    --rdp-cell-size: 28px !important;
    --rdp-day-height: 28px !important;
    --rdp-day-width: 28px !important;
    --rdp-nav_button-height: 28px !important;
    --rdp-nav_button-width: 28px !important;
    --rdp-nav_button-disabled-opacity: 0.5 !important;
    --rdp-today-color: #000000 !important;
    --rdp-selected-border: 2px solid #000000 !important;
    font-size: 0.875rem !important;
  }
  .rdp-head_cell {
    font-size: 0.75rem !important;
    font-weight: 500 !important;
  }
  .rdp-button {
    border-radius: 0.375rem !important;
  }
  .rdp-dropdown {
    font-size: 0.875rem !important;
    border-radius: 0.375rem !important;
    border: 1px solid hsl(var(--border)) !important;
  }
  .rdp-nav_button {
    color: #000000 !important;
    font-weight: bold !important;
    padding: 4px !important;
    border-radius: 4px !important;
    transition: all 0.2s ease !important;
  }
  .rdp-nav_button:hover {
    background-color: #f5f5f5 !important;
    transform: scale(1.1) !important;
  }
  .rdp-nav_button:active {
    transform: scale(0.95) !important;
  }
`

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [currentCountry, setCurrentCountry] = useState<string>("ph")
  const [address, setAddress] = useState("")
  const [zone, setZone] = useState("")
  const [dob, setDob] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [passwordFocus, setPasswordFocus] = useState(false)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<"resident" | "official">("resident")
  const [officialDepartment, setOfficialDepartment] = useState("")
  const [officialProfilePicture, setOfficialProfilePicture] = useState<string>("")
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  useEffect(() => {
    if (confirmPassword && password && confirmPassword !== password) {
      setConfirmPasswordError("Passwords do not match")
    } else {
      setConfirmPasswordError(null)
    }
  }, [confirmPassword, password])

  const handlePhoneChange = (phone: string, meta: { country: { iso2: string }, inputValue: string }) => {
    // Check if country changed
    if (meta.country.iso2 !== currentCountry) {
      setPhone("") // Clear phone when country changes
      setCurrentCountry(meta.country.iso2)
    } else {
      setPhone(phone)
    }
  }

  const getPasswordRequirements = (password: string) => {
    return {
      minLength: password.length >= 6,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
  }
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Debug logging
      console.log("Registration data:", { fullName, email, password, confirmPassword, phone, address, zone, selectedDate, acceptTerms })
      
      // Client-side validations for additional requirements
      if (!fullName.trim()) throw new Error("Full name is required")
      if (!email.trim()) throw new Error("Email is required")
      if (password.length < 6) throw new Error("Password must be at least 6 characters")
      if (password !== confirmPassword) throw new Error("Passwords do not match")
      
      // Strong password requirements
      const requirements = getPasswordRequirements(password)
      if (!requirements.minLength) throw new Error("Password must be at least 6 characters")
      if (!requirements.hasUpperCase) throw new Error("Password must contain at least one uppercase letter")
      if (!requirements.hasLowerCase) throw new Error("Password must contain at least one lowercase letter")
      if (!requirements.hasNumber) throw new Error("Password must contain at least one number")
      if (!requirements.hasSpecialChar) throw new Error("Password must contain at least one special character")
      
      if (!phone.trim()) throw new Error("Contact number is required")
      if (!/^\+?[0-9\-\s]{6,}$/.test(phone)) throw new Error("Enter a valid contact number")
      if (!address.trim()) throw new Error("Address is required")
      if (!zone.trim()) throw new Error("Zone/Purok is required")
      if (!selectedDate) throw new Error("Date of birth is required")
      if (selectedRole === "official" && !officialDepartment) throw new Error("Department is required for official registration")
      if (selectedRole === "official" && !officialProfilePicture) throw new Error("Profile picture is required for official registration")
      if (!acceptTerms) throw new Error("You must accept the Terms and Privacy Policy")

      const fullPhone = phone.trim()

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          password, 
          role: selectedRole,
          full_name: fullName,
          phone: fullPhone,
          address,
          zone,
          date_of_birth: selectedDate ? selectedDate.toISOString().split('T')[0] : "",
          department: selectedRole === "official" ? officialDepartment : "",
          profile_picture_base64: selectedRole === "official" ? officialProfilePicture : ""
        }),
        credentials: "same-origin",
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Registration failed")
      }

      if (selectedRole === "official") {
        setRegistrationSuccess(true)
      } else {
        router.push("/resident")
        router.refresh()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style jsx>{customStyles}</style>
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-green-50 to-green-100">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Account Registration</CardTitle>
            <CardDescription>Residents can log in immediately. Officials require admin approval.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label>Register as *</Label>
                  <Select value={selectedRole} onValueChange={(v: "resident" | "official") => setSelectedRole(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resident">Resident</SelectItem>
                      <SelectItem value="official">Official</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedRole === "official" && (
                    <p className="text-xs text-amber-600">Your account will require approval from an admin before you can log in.</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full name *</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Contact number *</Label>
                  <PhoneInput
                    defaultCountry="ph"
                    value={phone}
                    onChange={handlePhoneChange}
                    disableDialCodePrefill={false}
                    forceDialCode={true}
                    className="w-full"
                    inputClassName="w-full h-10 rounded-r-md border border-l-0 border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    countrySelectorStyleProps={{
                      buttonClassName: "rounded-l-md border border-input bg-gray-100 h-10 px-3 text-gray-500 cursor-not-allowed",
                      dropdownStyleProps: {
                        className: "bg-background border border-border rounded-md shadow-lg"
                      }
                    }}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House No., Street, Zone/Purok" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="zone">Zone/Purok *</Label>
                  <Input id="zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g., Zone 95" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <div className="relative">
                    <Input
                      id="dob"
                      type="text"
                      value={selectedDate ? selectedDate.toLocaleDateString() : ""}
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      placeholder="Select date of birth"
                      readOnly
                      className="cursor-pointer"
                    />
                    {showDatePicker && (
                      <div className="absolute top-full left-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg p-2">
                        <DayPicker
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date)
                            setShowDatePicker(false)
                          }}
                          captionLayout="dropdown"
                          fromYear={1920}
                          toYear={new Date().getFullYear()}
                          defaultMonth={selectedDate || new Date()}
                          className="text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    onFocus={() => setPasswordFocus(true)}
                    onBlur={() => setPasswordFocus(false)}
                    required 
                    minLength={6} 
                  />
                  {passwordFocus && password && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md text-xs space-y-1">
                      <p className="font-medium text-gray-700 mb-2">Password requirements:</p>
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 ${getPasswordRequirements(password).minLength ? 'text-green-600' : 'text-gray-500'}`}>
                          <span>{getPasswordRequirements(password).minLength ? '✓' : '○'}</span>
                          <span>At least 6 characters</span>
                        </div>
                        <div className={`flex items-center gap-2 ${getPasswordRequirements(password).hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
                          <span>{getPasswordRequirements(password).hasUpperCase ? '✓' : '○'}</span>
                          <span>One uppercase letter (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-2 ${getPasswordRequirements(password).hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
                          <span>{getPasswordRequirements(password).hasLowerCase ? '✓' : '○'}</span>
                          <span>One lowercase letter (a-z)</span>
                        </div>
                        <div className={`flex items-center gap-2 ${getPasswordRequirements(password).hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                          <span>{getPasswordRequirements(password).hasNumber ? '✓' : '○'}</span>
                          <span>One number (0-9)</span>
                        </div>
                        <div className={`flex items-center gap-2 ${getPasswordRequirements(password).hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                          <span>{getPasswordRequirements(password).hasSpecialChar ? '✓' : '○'}</span>
                          <span>One special character (!@#$%^&*)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm password *</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    minLength={6}
                    className={confirmPasswordError ? "border-red-500" : ""}
                  />
                  {confirmPasswordError && (
                    <p className="text-xs text-red-500">{confirmPasswordError}</p>
                  )}
                </div>
                {selectedRole === "official" && (
                  <>
                    <div className="grid gap-2">
                      <Label>Department *</Label>
                      <Select value={officialDepartment} onValueChange={setOfficialDepartment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Administration">Administration</SelectItem>
                          <SelectItem value="Public Safety">Public Safety</SelectItem>
                          <SelectItem value="Health Services">Health Services</SelectItem>
                          <SelectItem value="Social Services">Social Services</SelectItem>
                          <SelectItem value="Public Works">Public Works</SelectItem>
                          <SelectItem value="Disaster Response">Disaster Response</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="officialProfile">Profile picture *</Label>
                      <Input
                        id="officialProfile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) {
                            setOfficialProfilePicture("")
                            return
                          }
                          const reader = new FileReader()
                          reader.onload = () => setOfficialProfilePicture(String(reader.result || ""))
                          reader.readAsDataURL(file)
                        }}
                      />
                    </div>
                  </>
                )}
                <div className="flex items-start gap-2">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                  />
                  <Label htmlFor="acceptTerms" className="cursor-pointer">
                    <span className="inline-flex flex-wrap items-center gap-1">
                      I agree to the
                      <button
                        type="button"
                        className="text-primary underline underline-offset-2"
                        onClick={() => setTermsOpen(true)}
                      >
                        Terms of Service
                      </button>
                      and
                      <button
                        type="button"
                        className="text-primary underline underline-offset-2"
                        onClick={() => setPrivacyOpen(true)}
                      >
                        Privacy Policy
                      </button>
                    </span>
                  </Label>
                </div>
                {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                <Button type="submit" className="w-full" disabled={isLoading || !!confirmPasswordError}>
                  {isLoading ? "Creating account..." : "Register"}
                </Button>
                <div className="text-center text-sm">
                  Already have an account? <Link href="/login" className="text-primary hover:underline">Login</Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      {/* Registration Success Dialog for Officials */}
      <Dialog open={registrationSuccess} onOpenChange={setRegistrationSuccess}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registration Submitted</DialogTitle>
            <DialogDescription>Your official account is pending approval.</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <div className="mb-4 rounded-full bg-amber-100 p-4 w-16 h-16 mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your registration as an official has been submitted. An admin will review your account before you can log in.
            </p>
            <p className="text-sm text-muted-foreground">
              You will be redirected to the login page.
            </p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => { setRegistrationSuccess(false); router.push("/login") }}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Terms of Service Dialog */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
            <DialogDescription>Please review the following terms before creating an account.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto text-sm leading-6 space-y-3">
            <p>Welcome to the Barangay 867 Zone 95 Resident Portal. By creating an account, you agree to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide accurate information about your identity and residence.</li>
              <li>Use the portal respectfully and lawfully. Abuse, harassment, or spam is prohibited.</li>
              <li>Submit reports and requests in good faith and with truthful details.</li>
              <li>Comply with local ordinances and applicable national laws.</li>
            </ul>
            <p>We may update these terms periodically. Continued use of the portal constitutes acceptance of any changes.</p>
          </div>
        </DialogContent>
      </Dialog>
      {/* Privacy Policy Dialog */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription>How we collect, use, and protect your data.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto text-sm leading-6 space-y-3">
            <p>We collect your name, email, and other submitted details to provide services within the barangay portal.</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your information is used to manage your account and process reports or requests.</li>
              <li>We do not sell your personal data. Access is limited to authorized personnel.</li>
              <li>You can request updates or deletion of your data subject to legal and operational requirements.</li>
              <li>We implement reasonable safeguards to protect your data, but no system is 100% secure.</li>
            </ul>
            <p>If you have questions, please contact the Barangay Hall for assistance.</p>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
