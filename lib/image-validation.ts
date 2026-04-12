"use client"

import { useState, useRef, useEffect } from 'react'

type ValidationResult = {
  valid: boolean
  error?: string
  warnings?: string[]
}

type ImageValidationConfig = {
  type: 'id_front' | 'id_back' | 'selfie'
  minWidth?: number
  minHeight?: number
  maxFileSize?: number
}

const DEFAULT_CONFIG: Record<string, ImageValidationConfig> = {
  id_front: { type: 'id_front', minWidth: 400, minHeight: 250, maxFileSize: 2 * 1024 * 1024 },
  id_back: { type: 'id_back', minWidth: 400, minHeight: 250, maxFileSize: 2 * 1024 * 1024 },
  selfie: { type: 'selfie', minWidth: 200, minHeight: 200, maxFileSize: 2 * 1024 * 1024 },
}

// Check if browser supports FaceDetector
async function checkFaceDetectorSupport(): Promise<boolean> {
  if ('FaceDetector' in window) {
    try {
      // @ts-ignore - FaceDetector might not be in types
      const detector = new FaceDetector()
      await detector.detect(document.createElement('canvas'))
      return true
    } catch {
      return false
    }
  }
  return false
}

// Analyze image quality using canvas
function analyzeImageQuality(img: HTMLImageElement): { blur: number; brightness: number; contrast: number } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  // Scale down for performance
  const scale = Math.min(200 / img.width, 200 / img.height, 1)
  canvas.width = img.width * scale
  canvas.height = img.height * scale
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  let totalBrightness = 0
  let totalContrast = 0
  let edgePixels = 0
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    // Brightness (0-255)
    const brightness = (r + g + b) / 3
    totalBrightness += brightness
    
    // Simple edge detection for blur estimation
    if (i > 4 && i < data.length - 4) {
      const prevBrightness = (data[i - 4] + data[i - 3] + data[i - 2]) / 3
      const diff = Math.abs(brightness - prevBrightness)
      if (diff > 20) edgePixels++
    }
  }
  
  const pixelCount = data.length / 4
  const avgBrightness = totalBrightness / pixelCount
  const blurScore = edgePixels / pixelCount // Higher = sharper
  
  return {
    blur: blurScore,
    brightness: avgBrightness,
    contrast: 0, // Simplified
  }
}

// Detect face using basic analysis (fallback if FaceDetector not available)
function detectFaceBasic(img: HTMLImageElement): { hasFace: boolean; faceArea: number } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  canvas.width = img.width
  canvas.height = img.height
  ctx.drawImage(img, 0, 0)
  
  // Simple skin tone detection
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  let skinPixels = 0
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const centerRadius = Math.min(canvas.width, canvas.height) / 3
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const x = (i / 4) % canvas.width
    const y = Math.floor((i / 4) / canvas.width)
    
    // Simple skin tone detection (rough heuristic)
    const isSkinTone = r > 95 && g > 40 && b > 20 && 
                      r > g && r > b &&
                      Math.abs(r - g) > 15 &&
                      r - b > 15
    
    if (isSkinTone) {
      // Check if in center (likely face area)
      const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
      if (distFromCenter < centerRadius) {
        skinPixels++
      }
    }
  }
  
  const skinArea = skinPixels / (data.length / 4)
  // For selfie, expect skin in center. For ID, don't expect much skin.
  
  return {
    hasFace: skinArea > 0.05,
    faceArea: skinArea,
  }
}

// Main validation function
export async function validateImage(
  file: File,
  type: 'id_front' | 'id_back' | 'selfie'
): Promise<ValidationResult> {
  const warnings: string[] = []
  const config = DEFAULT_CONFIG[type]
  
  // 1. File size check
  if (file.size > config.maxFileSize!) {
    return { valid: false, error: `File too large. Maximum size is ${config.maxFileSize! / 1024 / 1024}MB.` }
  }
  
  // 2. File type check
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please upload an image file.' }
  }
  
  // 3. Load image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
  
  // 4. Dimension check
  if (img.width < config.minWidth! || img.height < config.minHeight!) {
    return { 
      valid: false, 
      error: `Image too small. Minimum ${config.minWidth}x${config.minHeight} pixels required.` 
    }
  }
  
  // 5. Image quality analysis
  const quality = analyzeImageQuality(img)
  
  // Check brightness
  if (quality.brightness < 50) {
    warnings.push('Image might be too dark')
  } else if (quality.brightness > 230) {
    warnings.push('Image might be too bright')
  }
  
  // Check blur (low edge = blurry)
  if (quality.blur < 0.05) {
    warnings.push('Image might be blurry')
  }
  
  // 6. Face detection for selfie
  if (type === 'selfie') {
    const face = detectFaceBasic(img)
    if (!face.hasFace) {
      warnings.push('No face detected. Please take a clear selfie.')
    } else if (face.faceArea < 0.03) {
      warnings.push('Face not clearly visible. Please move closer.')
    }
  }
  
  // 7. ID-specific checks
  if (type === 'id_front' || type === 'id_back') {
    const face = detectFaceBasic(img)
    if (face.faceArea > 0.2) {
      return { 
        valid: false, 
        error: 'This looks like a selfie, not an ID. Please upload the front of your ID.' 
      }
    }
    
    // Check aspect ratio for ID (should be landscape, not portrait)
    const aspectRatio = img.width / img.height
    if (aspectRatio < 1.2) {
      return { 
        valid: false, 
        error: 'ID should be in landscape orientation. Please rotate your image.' 
      }
    }
  }
  
  // Clean up
  URL.revokeObjectURL(img.src)
  
  if (warnings.length > 0) {
    return { valid: true, warnings }
  }
  
  return { valid: true }
}

// Hook for using in components
export function useImageValidator() {
  const [validating, setValidating] = useState(false)
  
  const validate = async (file: File, type: 'id_front' | 'id_back' | 'selfie') => {
    setValidating(true)
    try {
      return await validateImage(file, type)
    } finally {
      setValidating(false)
    }
  }
  
  return { validate, validating }
}