"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, Loader2, LocateFixed, ShieldCheck, XCircle, Search } from "lucide-react"

export interface PickedLocation {
  lat: number
  lng: number
  address: string
}

interface LocationPickerMapProps {
  value?: PickedLocation | null
  onChange: (location: PickedLocation) => void
}

// Nominatim reverse geocode (OpenStreetMap, no key needed)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } }
    )
    const json = await res.json()
    return json.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}

// Nominatim forward geocode — address string → {lat, lng, display_name}[]
async function searchAddresses(query: string): Promise<{ lat: number; lng: number; display_name: string }[]> {
  try {
    const params = new URLSearchParams({ format: "jsonv2", q: query, limit: "6", countrycodes: "ph" })
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "Accept-Language": "en" },
    })
    const json = await res.json()
    return json.map((r: any) => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), display_name: r.display_name }))
  } catch {
    return []
  }
}

export function LocationPickerMap({ value, onChange }: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  // "unknown" | "prompt" | "granted" | "denied"
  const [permState, setPermState] = useState<"unknown" | "prompt" | "granted" | "denied">("unknown")
  const [showPermPrompt, setShowPermPrompt] = useState(false)
  const [manualAddress, setManualAddress] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<{ lat: number; lng: number; display_name: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchWrapperRef = useRef<HTMLDivElement>(null)

  // Default center: Philippines (Quezon City area)
  const DEFAULT_CENTER: [number, number] = [14.676, 121.0437]
  const DEFAULT_ZOOM = 14

  useEffect(() => {
    if (!mapRef.current) return

    let cancelled = false

    // Dynamically import Leaflet (client-side only)
    ;(async () => {
      const L = (await import("leaflet")).default
      // @ts-expect-error — css import, no types needed
      await import("leaflet/dist/leaflet.css")

      // Bail if cleanup already ran or container was already initialized
      if (cancelled || !mapRef.current) return
      if ((mapRef.current as any)._leaflet_id) {
        // Container still has a stale Leaflet instance — remove it first
        try { (L as any).map(mapRef.current).remove() } catch {}
      }

      // Fix default marker icons (webpack asset issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const initialCenter: [number, number] = value
        ? [value.lat, value.lng]
        : DEFAULT_CENTER

      const map = L.map(mapRef.current!, {
        center: initialCenter,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      })

      if (cancelled) { map.remove(); return }

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Place marker if we already have a value
      if (value) {
        const marker = L.marker([value.lat, value.lng], { draggable: true }).addTo(map)
        marker.on("dragend", async () => {
          const pos = marker.getLatLng()
          setIsGeocoding(true)
          const address = await reverseGeocode(pos.lat, pos.lng)
          setIsGeocoding(false)
          onChange({ lat: pos.lat, lng: pos.lng, address })
        })
        markerRef.current = marker
      }

      // Click on map to place/move marker
      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
          marker.on("dragend", async () => {
            const pos = marker.getLatLng()
            setIsGeocoding(true)
            const address = await reverseGeocode(pos.lat, pos.lng)
            setIsGeocoding(false)
            onChange({ lat: pos.lat, lng: pos.lng, address })
          })
          markerRef.current = marker
        }
        setIsGeocoding(true)
        const address = await reverseGeocode(lat, lng)
        setIsGeocoding(false)
        setManualAddress(address)
        onChange({ lat, lng, address })
      })

      leafletMapRef.current = map
      setMapReady(true)
    })()

    return () => {
      cancelled = true
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        markerRef.current = null
        setMapReady(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check geolocation permission state on mount
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) {
      setPermState("prompt") // assume prompt if API unavailable
      return
    }
    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      setPermState(result.state as "prompt" | "granted" | "denied")
      result.addEventListener("change", () => {
        setPermState(result.state as "prompt" | "granted" | "denied")
        if (result.state === "granted") setShowPermPrompt(false)
      })
    }).catch(() => setPermState("prompt"))
  }, [])

  const requestAndLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }
    setShowPermPrompt(false)
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setPermState("granted")
        const map = leafletMapRef.current
        if (map) {
          map.setView([lat, lng], 17)
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else {
            const L = (await import("leaflet")).default
            const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
            marker.on("dragend", async () => {
              const p = marker.getLatLng()
              setIsGeocoding(true)
              const address = await reverseGeocode(p.lat, p.lng)
              setIsGeocoding(false)
              onChange({ lat: p.lat, lng: p.lng, address })
            })
            markerRef.current = marker
          }
        }
        setIsLocating(false)
        setIsGeocoding(true)
        const address = await reverseGeocode(lat, lng)
        setIsGeocoding(false)
        setManualAddress(address)
        onChange({ lat, lng, address })
      },
      (err) => {
        setIsLocating(false)
        if (err.code === 1 /* PERMISSION_DENIED */) {
          setPermState("denied")
        } else {
          alert("Could not get your location: " + err.message)
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleMyLocation = () => {
    if (permState === "denied") return
    if (permState === "prompt" || permState === "unknown") {
      setShowPermPrompt(true)
      return
    }
    requestAndLocate()
  }

  const placeMarkerAt = useCallback(async (lat: number, lng: number, address: string) => {
    const map = leafletMapRef.current
    if (!map) return
    const L = (await import("leaflet")).default
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
      marker.on("dragend", async () => {
        const p = marker.getLatLng()
        setIsGeocoding(true)
        const addr = await reverseGeocode(p.lat, p.lng)
        setIsGeocoding(false)
        setManualAddress(addr)
        onChange({ lat: p.lat, lng: p.lng, address: addr })
      })
      markerRef.current = marker
    }
    map.setView([lat, lng], 17)
    onChange({ lat, lng, address })
  }, [onChange])

  const handleSearchAddress = async () => {
    const q = manualAddress.trim()
    if (!q) return
    setSearchError(null)
    setIsSearching(true)
    setSuggestions([])
    setShowSuggestions(false)
    const results = await searchAddresses(q)
    setIsSearching(false)
    if (!results.length) {
      setSearchError("Address not found. Try a more specific address.")
      return
    }
    const first = results[0]
    setManualAddress(first.display_name)
    placeMarkerAt(first.lat, first.lng, first.display_name)
  }

  const handleAddressChange = (val: string) => {
    setManualAddress(val)
    setSearchError(null)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (val.trim().length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchAddresses(val.trim())
      setIsSearching(false)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    }, 400)
  }

  const handleSelectSuggestion = (s: { lat: number; lng: number; display_name: string }) => {
    setManualAddress(s.display_name)
    setSuggestions([])
    setShowSuggestions(false)
    setSearchError(null)
    placeMarkerAt(s.lat, s.lng, s.display_name)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="space-y-2">
      {/* In-app permission prompt (shown before browser dialog) */}
      {showPermPrompt && (
        <Alert className="border-blue-200 bg-blue-50">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-blue-900 text-sm">Allow location access</p>
              <p className="text-blue-700 text-xs mt-0.5">
                Your browser will ask for permission to access your GPS location. This is used only to pin the incident location on the map.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 mt-0.5">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowPermPrompt(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={requestAndLocate}>
                Allow
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Denied state */}
      {permState === "denied" && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-xs">
            Location access is blocked. To enable it, click the lock icon in your browser&apos;s address bar and allow location for this site, then reload the page.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2">
        {permState !== "denied" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMyLocation}
            disabled={isLocating || !mapReady}
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4 mr-2" />
            )}
            {isLocating ? "Getting location..." : "Use my GPS location"}
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {permState === "denied" ? "Type an address or click the map to pin" : "or click on the map to pin"}
        </span>
      </div>

      {/* Manual address search */}
      <div className="flex gap-2" ref={searchWrapperRef}>
        <div className="relative flex-1">
          <Input
            placeholder="Type an address to search..."
            value={manualAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSearchAddress() }
              if (e.key === "Escape") setShowSuggestions(false)
            }}
            onFocus={() => { if (suggestions.length) setShowSuggestions(true) }}
            disabled={false}
            className="pr-8"
            autoComplete="off"
          />
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-2.5 text-muted-foreground" />
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-auto text-sm">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s) }}
                >
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-500" />
                  <span className="break-words leading-snug">{s.display_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSearchAddress}
          disabled={isSearching || !manualAddress.trim()}
        >
          <Search className="h-4 w-4 mr-1" />
          Search
        </Button>
      </div>

      {searchError && (
        <p className="text-xs text-red-500">{searchError}</p>
      )}

      <div
        ref={mapRef}
        className="w-full rounded-lg border overflow-hidden"
        style={{ height: 300 }}
      />

      {value && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          {isGeocoding ? (
            <Loader2 className="h-4 w-4 mt-0.5 shrink-0 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
          )}
          <span className="break-words">{isGeocoding ? "Looking up address..." : value.address}</span>
        </div>
      )}
    </div>
  )
}
