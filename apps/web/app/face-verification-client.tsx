"use client"

import * as React from "react"
import {
  BadgeCheck,
  Camera,
  CameraOff,
  CheckCircle2,
  Download,
  IdCard,
  Loader2,
  RotateCcw,
  ScanFace,
  Search,
  ShieldCheck,
  UploadCloud,
  UserPlus,
  XCircle,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type VerificationMode = "register" | "identify" | "verify"
type CameraState = "idle" | "starting" | "active" | "unavailable"
type FacingMode = "user" | "environment"
type ResultTone = "success" | "warning" | "danger"

type OpenCameraOptions = {
  deviceId?: string
  facingMode?: FacingMode
  forceFacing?: boolean
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

type ResultDetail = {
  label: string
  value: string
}

type ApiResult = {
  tone: ResultTone
  title: string
  message: string
  details: ResultDetail[]
  raw: unknown
}

type ModeConfig = {
  id: VerificationMode
  label: string
  endpoint: string
  Icon: React.ComponentType<{ className?: string }>
}

const modes: ModeConfig[] = [
  {
    id: "register",
    label: "Register",
    endpoint: "/api/face/generate-template",
    Icon: UserPlus,
  },
  {
    id: "identify",
    label: "Identify",
    endpoint: "/api/face/identify",
    Icon: Search,
  },
  {
    id: "verify",
    label: "Verify",
    endpoint: "/api/face/verify",
    Icon: ShieldCheck,
  },
]

const inputClassName =
  "h-12 w-full rounded-[8px] border border-[#bde7e8] bg-[#f8fbff] px-3 text-base text-[#263b3e] shadow-sm outline-none transition placeholder:text-[#829898] focus:border-[#52C2C3] focus:ring-3 focus:ring-[#52C2C3]/22 sm:text-sm dark:border-white/10 dark:bg-white/8 dark:text-white dark:focus:border-[#52C2C3]"

const apiBaseUrl =
  process.env.NEXT_PUBLIC_FACE_API_BASE_URL?.replace(/\/$/, "") ?? ""

function cameraLabel(mode: FacingMode) {
  return mode === "user" ? "Selfie camera" : "Rear camera"
}

function isFacingMode(value: unknown): value is FacingMode {
  return value === "user" || value === "environment"
}

function inferFacingModeFromLabel(label: string): FacingMode | null {
  const normalizedLabel = label.toLowerCase()

  if (/(back|rear|environment|world|main)/.test(normalizedLabel)) {
    return "environment"
  }

  if (/(front|user|face|selfie)/.test(normalizedLabel)) {
    return "user"
  }

  return null
}

async function getVideoDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return []
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((device) => device.kind === "videoinput")
}

function findCameraDevice(
  devices: MediaDeviceInfo[],
  targetFacingMode: FacingMode,
  currentDeviceId?: string
) {
  const matchingDevices = devices.filter(
    (device) => inferFacingModeFromLabel(device.label) === targetFacingMode
  )

  return (
    matchingDevices.find((device) => device.deviceId !== currentDeviceId) ??
    matchingDevices[0] ??
    devices.find((device) => device.deviceId !== currentDeviceId) ??
    devices[0]
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(payload: unknown, key: string) {
  if (!isRecord(payload)) {
    return ""
  }

  const value = payload[key]
  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return ""
}

function readBoolean(payload: unknown, key: string) {
  if (!isRecord(payload)) {
    return undefined
  }

  const value = payload[key]
  return typeof value === "boolean" ? value : undefined
}

function buildRequestUrl(path: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString()
  return `${apiBaseUrl}${path}${query ? `?${query}` : ""}`
}

function payloadMessage(payload: unknown, fallback: string) {
  return (
    readString(payload, "successMessage") ||
    readString(payload, "errorMessage") ||
    readString(payload, "message") ||
    readString(payload, "status") ||
    fallback
  )
}

function resultFromPayload(
  mode: VerificationMode,
  responseOk: boolean,
  statusText: string,
  payload: unknown
): ApiResult {
  if (!responseOk) {
    return {
      tone: "danger",
      title: "Request failed",
      message: payloadMessage(
        payload,
        statusText || "The server returned an error."
      ),
      details: compactDetails([
        ["Status", readString(payload, "status") || statusText],
        ["Matched with", readString(payload, "matchedWith")],
      ]),
      raw: payload,
    }
  }

  if (mode === "register") {
    const success = readBoolean(payload, "success")

    return {
      tone: success === false ? "danger" : "success",
      title: success === false ? "Registration failed" : "Template registered",
      message: payloadMessage(payload, "Face template was saved."),
      details: compactDetails([
        ["Person", readString(payload, "personName")],
        ["NID", readString(payload, "nidNumber")],
        ["Status", readString(payload, "status")],
      ]),
      raw: payload,
    }
  }

  if (mode === "identify") {
    const success = readBoolean(payload, "success")

    return {
      tone: success === false ? "warning" : "success",
      title: success === false ? "No identity match" : "Identity found",
      message: payloadMessage(payload, "Identification completed."),
      details: compactDetails([
        ["Matched with", readString(payload, "matchedWith")],
        ["Status", readString(payload, "status")],
      ]),
      raw: payload,
    }
  }

  const matched = readBoolean(payload, "matched")

  return {
    tone: matched === false ? "warning" : "success",
    title: matched === false ? "Face not verified" : "Face verified",
    message: payloadMessage(payload, "Verification completed."),
    details: compactDetails([
      ["Reference NID", readString(payload, "referenceNidNumber")],
      ["Matched", typeof matched === "boolean" ? String(matched) : ""],
      ["Status", readString(payload, "status")],
    ]),
    raw: payload,
  }
}

function compactDetails(entries: Array<[string, string]>): ResultDetail[] {
  return entries
    .filter((entry) => entry[1].trim().length > 0)
    .map(([label, value]) => ({ label, value }))
}

async function readResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    return (await response.json()) as unknown
  }

  const text = await response.text()

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function fileSizeLabel(file: File | null) {
  if (!file) {
    return "No image"
  }

  if (file.size < 1024 * 1024) {
    return `${Math.max(1, Math.round(file.size / 1024))} KB`
  }

  return `${(file.size / (1024 * 1024)).toFixed(1)} MB`
}

export function FaceVerificationClient() {
  const [mode, setMode] = React.useState<VerificationMode>("register")
  const [cameraState, setCameraState] = React.useState<CameraState>("idle")
  const [facingMode, setFacingMode] = React.useState<FacingMode>("user")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [personName, setPersonName] = React.useState("")
  const [nidNumber, setNidNumber] = React.useState("")
  const [referenceNidNumber, setReferenceNidNumber] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<ApiResult | null>(null)
  const [notice, setNotice] = React.useState("")
  const [installPrompt, setInstallPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null)
  const [appInstalled, setAppInstalled] = React.useState(() => {
    if (typeof window === "undefined") {
      return false
    }

    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  })
  const [installingApp, setInstallingApp] = React.useState(false)

  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const previewObjectUrlRef = React.useRef<string | null>(null)

  const activeMode = modes.find((item) => item.id === mode) ?? modes[0]!
  const ActiveModeIcon = activeMode.Icon

  const stopTracks = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const updateSelectedImage = React.useCallback((file: File) => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    previewObjectUrlRef.current = nextPreviewUrl
    setSelectedFile(file)
    setPreviewUrl(nextPreviewUrl)
    setResult(null)
    setNotice("")
  }, [])

  const openCamera = React.useCallback(
    async (options: OpenCameraOptions = {}) => {
      const nextFacingMode = options.facingMode ?? facingMode
      setNotice("")

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("unavailable")
        setNotice("Camera is unavailable in this browser.")
        return null
      }

      setCameraState("starting")
      stopTracks()

      try {
        const baseConstraints = {
          height: { ideal: 1080 },
          width: { ideal: 1440 },
        } satisfies MediaTrackConstraints
        const videoConstraints: MediaTrackConstraints[] = []

        if (options.deviceId) {
          videoConstraints.push({
            ...baseConstraints,
            deviceId: { exact: options.deviceId },
          })
        }

        if (options.forceFacing) {
          videoConstraints.push({
            ...baseConstraints,
            facingMode: { exact: nextFacingMode },
          })
        }

        videoConstraints.push({
          ...baseConstraints,
          facingMode: { ideal: nextFacingMode },
        })

        let stream: MediaStream | null = null
        let cameraError: unknown = null

        for (const video of videoConstraints) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video,
            })
            break
          } catch (error) {
            cameraError = error
          }
        }

        if (!stream) {
          throw cameraError
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const settings = stream.getVideoTracks()[0]?.getSettings()
        let actualFacingMode = nextFacingMode

        if (isFacingMode(settings?.facingMode)) {
          actualFacingMode = settings.facingMode
        } else if (settings?.deviceId) {
          const devices = await getVideoDevices().catch(() => [])
          const activeDevice = devices.find(
            (device) => device.deviceId === settings.deviceId
          )
          actualFacingMode =
            inferFacingModeFromLabel(activeDevice?.label ?? "") ??
            actualFacingMode
        }

        setFacingMode(actualFacingMode)
        setCameraState("active")
        return actualFacingMode
      } catch (error) {
        setCameraState("unavailable")
        setNotice(
          error instanceof Error
            ? error.message
            : "Camera permission could not be opened."
        )
        return null
      }
    },
    [facingMode, stopTracks]
  )

  const closeCamera = React.useCallback(() => {
    stopTracks()
    setCameraState("idle")
  }, [stopTracks])

  React.useEffect(() => {
    return () => {
      stopTracks()

      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current)
      }
    }
  }, [stopTracks])

  React.useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      setAppInstalled(true)
      setInstallPrompt(null)
      setNotice("App installed successfully.")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => undefined)
  }, [])

  async function switchCamera() {
    const nextFacingMode = facingMode === "user" ? "environment" : "user"
    setFacingMode(nextFacingMode)

    if (cameraState !== "active" && cameraState !== "starting") {
      setNotice(`Camera will start with ${cameraLabel(nextFacingMode)}.`)
      return
    }

    if (cameraState === "active" || cameraState === "starting") {
      const currentDeviceId = streamRef.current
        ?.getVideoTracks()[0]
        ?.getSettings().deviceId
      const devices = await getVideoDevices().catch(() => [])
      const targetDevice = findCameraDevice(
        devices,
        nextFacingMode,
        currentDeviceId
      )
      const actualFacingMode = await openCamera({
        deviceId: targetDevice?.deviceId,
        facingMode: nextFacingMode,
        forceFacing: true,
      })

      if (actualFacingMode && actualFacingMode !== nextFacingMode) {
        setNotice(
          `${cameraLabel(nextFacingMode)} is not available on this device.`
        )
      }
    }
  }

  async function captureFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || cameraState !== "active") {
      setNotice("Start camera before capturing.")
      return
    }

    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) {
      setNotice("Camera frame is not ready yet.")
      return
    }

    canvas.width = width
    canvas.height = height
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", 0.92)
    })

    if (!blob) {
      setNotice("Could not capture an image.")
      return
    }

    updateSelectedImage(
      new File([blob], `nid-face-${Date.now()}.jpg`, { type: "image/jpeg" })
    )
  }

  async function installApp() {
    setNotice("")

    if (appInstalled) {
      setNotice("App is already installed on this device.")
      return
    }

    if (!installPrompt) {
      setNotice("Use your browser menu and choose Add to Home Screen.")
      return
    }

    setInstallingApp(true)

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice

      setNotice(
        choice.outcome === "accepted"
          ? "App install started."
          : "App install was not completed."
      )
      setInstallPrompt(null)
    } finally {
      setInstallingApp(false)
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    updateSelectedImage(file)
    event.target.value = ""
  }

  function validateForm() {
    if (!selectedFile) {
      return "Capture or upload a face image."
    }

    if (mode === "register" && (!personName.trim() || !nidNumber.trim())) {
      return "Person name and NID number are required."
    }

    if (mode === "verify" && !referenceNidNumber.trim()) {
      return "Reference NID number is required."
    }

    return ""
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationMessage = validateForm()

    if (validationMessage) {
      setNotice(validationMessage)
      return
    }

    if (!selectedFile) {
      return
    }

    const formData = new FormData()
    let url = ""

    if (mode === "register") {
      formData.append("face-image", selectedFile)
      url = buildRequestUrl("/api/face/generate-template", {
        "nid-number": nidNumber.trim(),
        "person-name": personName.trim(),
      })
    } else if (mode === "identify") {
      formData.append("person-image", selectedFile)
      url = buildRequestUrl("/api/face/identify")
    } else {
      formData.append("person-image", selectedFile)
      url = buildRequestUrl("/api/face/verify", {
        "reference-nid-number": referenceNidNumber.trim(),
      })
    }

    setSubmitting(true)
    setNotice("")
    setResult(null)

    try {
      const response = await fetch(url, {
        body: formData,
        headers: {
          Accept: "application/json, text/plain, */*",
        },
        method: "POST",
      })
      const payload = await readResponsePayload(response)
      setResult(
        resultFromPayload(mode, response.ok, response.statusText, payload)
      )
    } catch (error) {
      setResult({
        tone: "danger",
        title: "Network error",
        message:
          error instanceof Error
            ? error.message
            : "The request could not be completed.",
        details: compactDetails([["Endpoint", activeMode.endpoint]]),
        raw: null,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const cameraIsLive = cameraState === "active"
  const currentCameraLabel = cameraLabel(facingMode)
  const nextFacingMode = facingMode === "user" ? "environment" : "user"
  const nextCameraLabel = cameraLabel(nextFacingMode)
  const submitDisabled = submitting || Boolean(validateForm())
  const modeHint =
    mode === "register"
      ? "Create a new NID face profile"
      : mode === "identify"
        ? "Find a person from one face image"
        : "Match the face against an NID number"

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#d9eeee] pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-[#263b3e] lg:pb-0 dark:bg-[#061416] dark:text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4 sm:gap-5 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 flex flex-col gap-3 rounded-[8px] border border-white/55 bg-[#f2fbfa]/92 px-3 py-3 shadow-xl shadow-[#6e9692]/18 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-[#52C2C3]/15 dark:bg-[#071d1f]/92">
          <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:justify-start">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[8px] border border-[#52C2C3]/35 bg-white text-[#52C2C3] shadow-sm shadow-[#52C2C3]/20 dark:border-[#52C2C3]/35 dark:bg-[#0b3235] dark:text-[#52C2C3]">
                <ScanFace className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#2f9fa0] uppercase dark:text-[#bdf5f5]">
                  Face matching
                </p>
                <h1 className="truncate text-2xl font-semibold text-[#52C2C3] sm:text-3xl dark:text-[#52C2C3]">
                  NID Face Match
                </h1>
              </div>
            </div>
            <button
              className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-[8px] border border-[#52C2C3]/35 bg-[#52C2C3] text-white shadow-sm shadow-[#52C2C3]/30 sm:hidden"
              onClick={() => void installApp()}
              title="Install app"
              type="button"
            >
              {installingApp ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Download className="size-5" />
              )}
            </button>
          </div>
     
        </header>

        <section className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-5">
          <div className="flex min-w-0 flex-col gap-3 rounded-[8px] border border-white/55 bg-[#f2fbfa]/90 p-3 shadow-xl shadow-[#6e9692]/18 backdrop-blur sm:gap-4 sm:p-4 dark:border-[#52C2C3]/16 dark:bg-white/6 dark:shadow-black/20">
            <div className="grid gap-1 text-left sm:text-center">
              <h2 className="text-base font-semibold">Face recognition</h2>
              <p className="text-xs text-[#657b7b] dark:text-white/58">
                Position the face inside the frame
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 truncate text-xs text-[#657b7b] dark:text-white/58">
                {selectedFile?.name ?? "Camera and image input"}
              </div>
              <div className="flex h-9 items-center gap-1 rounded-[8px] border border-[#bde7e8] bg-white/82 px-2 text-xs font-semibold text-[#52C2C3] dark:border-[#52C2C3]/18 dark:bg-white/8 dark:text-[#52C2C3]">
                <ScanFace className="size-4" />
                {fileSizeLabel(selectedFile)}
              </div>
            </div>

            <div className="relative h-[min(62dvh,560px)] min-h-[380px] overflow-hidden rounded-[8px] bg-[#061513] text-white shadow-2xl ring-1 shadow-[#6e9692]/22 ring-[#05aa99]/15 sm:aspect-video sm:h-auto sm:min-h-[420px] lg:min-h-[430px]">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#06211e_0%,#074f47_48%,#071513_100%)]" />
              <video
                ref={videoRef}
                autoPlay
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-300",
                  cameraIsLive ? "opacity-100" : "opacity-0",
                  facingMode === "user" ? "-scale-x-100" : "scale-x-100"
                )}
                muted
                playsInline
              />
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Selected face"
                  className={cn(
                    "absolute inset-0 size-full object-cover transition-opacity duration-300",
                    cameraIsLive ? "opacity-45" : "opacity-100"
                  )}
                  src={previewUrl}
                />
              ) : null}
              {!previewUrl && !cameraIsLive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="face-pulse relative z-10 flex size-24 items-center justify-center rounded-full border border-[#5eead4]/55 bg-white/8">
                    <ScanFace className="size-12 text-[#dffbf7]" />
                  </div>
                  <div className="relative z-10 rounded-[8px] bg-[#031b18]/45 px-4 py-2 backdrop-blur-sm">
                    <p className="text-lg font-semibold">Face scan</p>
                    <p className="mt-1 text-sm text-[#dffbf7]/75">
                      Ready for image input
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="scanner-grid pointer-events-none absolute inset-0" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,13,19,0.05)_0%,transparent_25%,transparent_70%,rgba(8,13,19,0.42)_100%)]" />
              <div className="scan-face-frame pointer-events-none absolute inset-x-[18%] top-[11%] bottom-[11%] rounded-[48%] border border-[#5eead4]/60 shadow-[0_0_70px_rgba(5,170,153,0.24)]" />
              <div className="scan-band pointer-events-none absolute inset-x-[12%] top-[15%] h-24 rounded-full bg-[linear-gradient(180deg,rgba(94,234,212,0.20),rgba(5,170,153,0.10),transparent)]" />
              <div className="scan-line pointer-events-none absolute inset-x-[11%] top-[17%] h-[3px] rounded-full bg-[linear-gradient(90deg,transparent,rgba(5,170,153,0.98),rgba(94,234,212,0.96),rgba(223,251,247,0.82),transparent)] shadow-[0_0_36px_rgba(5,170,153,0.85)]" />
              <div className="pointer-events-none absolute top-5 left-5 size-14 border-t-2 border-l-2 border-[#05aa99]/85" />
              <div className="pointer-events-none absolute top-5 right-5 size-14 border-t-2 border-r-2 border-[#5eead4]/85" />
              <div className="pointer-events-none absolute bottom-5 left-5 size-14 border-b-2 border-l-2 border-[#9ff6eb]/75" />
              <div className="pointer-events-none absolute right-5 bottom-5 size-14 border-r-2 border-b-2 border-[#05aa99]/85" />
              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-[8px] bg-black/45 px-3 py-2 text-xs font-medium text-[#dffbf7] backdrop-blur">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    cameraIsLive ? "bg-[#05aa99]" : "bg-[#9ff6eb]"
                  )}
                />
                {cameraState === "starting"
                  ? `Starting ${currentCameraLabel}`
                  : cameraIsLive
                    ? currentCameraLabel
                    : `Ready: ${currentCameraLabel}`}
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
            <input
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              type="file"
            />

            <div className="grid grid-cols-6 gap-2 sm:grid-cols-5">
              <Button
                className="col-span-3 h-12 touch-manipulation bg-[#52C2C3] text-white shadow-sm shadow-[#52C2C3]/30 hover:bg-[#49b6b7] sm:col-span-1 sm:h-11"
                disabled={cameraState === "starting"}
                onClick={() => void openCamera()}
                title="Start camera"
                type="button"
              >
                {cameraState === "starting" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                Start
              </Button>
              <Button
                className="col-span-3 h-12 touch-manipulation border-[#bde7e8] bg-white/78 text-[#2f9fa0] hover:bg-[#e7fbfb] hover:text-[#52C2C3] sm:col-span-1 sm:h-11 dark:border-[#52C2C3]/18 dark:bg-white/7 dark:text-[#52C2C3] dark:hover:bg-[#52C2C3]/14"
                disabled={!cameraIsLive}
                onClick={captureFrame}
                title="Capture image"
                type="button"
                variant="outline"
              >
                <ScanFace className="size-4" />
                Capture
              </Button>
              <Button
                className="col-span-2 h-12 touch-manipulation border-[#bde7e8] bg-white/78 text-[#2f9fa0] hover:bg-[#e7fbfb] hover:text-[#52C2C3] sm:col-span-1 sm:h-11 dark:border-[#52C2C3]/18 dark:bg-white/7 dark:text-[#52C2C3] dark:hover:bg-[#52C2C3]/14"
                disabled={cameraState === "starting"}
                onClick={() => void switchCamera()}
                title={`Switch to ${nextCameraLabel}`}
                type="button"
                variant="outline"
              >
                <RotateCcw className="size-4" />
                {nextFacingMode === "user" ? "Selfie" : "Rear"}
              </Button>
              <Button
                className="col-span-2 h-12 touch-manipulation border-[#bde7e8] bg-white/78 text-[#2f9fa0] hover:bg-[#e7fbfb] hover:text-[#52C2C3] sm:col-span-1 sm:h-11 dark:border-[#52C2C3]/18 dark:bg-white/7 dark:text-[#52C2C3] dark:hover:bg-[#52C2C3]/14"
                onClick={() => fileInputRef.current?.click()}
                title="Upload image"
                type="button"
                variant="outline"
              >
                <UploadCloud className="size-4" />
                Upload
              </Button>
              <Button
                className="col-span-2 h-12 touch-manipulation sm:col-span-1 sm:h-11"
                disabled={cameraState === "idle"}
                onClick={closeCamera}
                title="Stop camera"
                type="button"
                variant="destructive"
              >
                <CameraOff className="size-4" />
                Stop
              </Button>
            </div>

            {notice ? (
              <div className="rounded-[8px] border border-[#f5c04a]/35 bg-[#fff8eb] px-3 py-2 text-sm text-[#8a5b12] dark:border-[#f5c04a]/25 dark:bg-[#3b2a09]/34 dark:text-[#ffe7a3]">
                {notice}
              </div>
            ) : null}
          </div>

          <form
            className="flex min-w-0 flex-col rounded-[8px] border border-white/55 bg-[#f2fbfa]/90 p-3 shadow-xl shadow-[#6e9692]/18 backdrop-blur sm:p-4 dark:border-[#52C2C3]/16 dark:bg-white/6 dark:shadow-black/20"
            onSubmit={(event) => void submitRequest(event)}
          >
            <div className="mb-4 hidden grid-cols-3 gap-1 rounded-[8px] border border-white/70 bg-white/72 p-1 sm:grid dark:border-[#52C2C3]/16 dark:bg-white/6">
              {modes.map((item) => {
                const Icon = item.Icon
                const selected = item.id === mode

                return (
                  <button
                    className={cn(
                      "flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-[7px] px-2 text-sm font-semibold transition",
                      selected
                        ? "bg-[#52C2C3] text-white shadow-sm shadow-[#52C2C3]/30"
                        : "text-[#607878] hover:bg-[#e7fbfb] dark:text-white/68 dark:hover:bg-white/8"
                    )}
                    key={item.id}
                    onClick={() => {
                      setMode(item.id)
                      setResult(null)
                      setNotice("")
                    }}
                    type="button"
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-start justify-between gap-3 border-b border-[#bde7e8] pb-4 dark:border-[#52C2C3]/14">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">{activeMode.label}</h2>
                <p className="text-sm text-[#657b7b] dark:text-white/58">
                  {modeHint}
                </p>
            
              </div>
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#52C2C3]/35 bg-white text-[#52C2C3] dark:border-[#52C2C3]/24 dark:bg-[#0b3235] dark:text-[#52C2C3]">
                <ActiveModeIcon className="size-5" />
              </div>
            </div>

            <div className="grid gap-3 py-4">
              {mode === "register" ? (
                <>
                  <Field label="Person name">
                    <input
                      className={inputClassName}
                      onChange={(event) => setPersonName(event.target.value)}
                      placeholder="Full name"
                      type="text"
                      value={personName}
                    />
                  </Field>
                  <Field label="NID number">
                    <input
                      className={inputClassName}
                      inputMode="numeric"
                      onChange={(event) => setNidNumber(event.target.value)}
                      placeholder="NID number"
                      type="text"
                      value={nidNumber}
                    />
                  </Field>
                </>
              ) : null}

              {mode === "verify" ? (
                <Field label="Reference NID number">
                  <input
                    className={inputClassName}
                    inputMode="numeric"
                    onChange={(event) =>
                      setReferenceNidNumber(event.target.value)
                    }
                    placeholder="Reference NID"
                    type="text"
                    value={referenceNidNumber}
                  />
                </Field>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <Metric
                  label="Image"
                  value={selectedFile ? "Loaded" : "Empty"}
                />
                <Metric
                  label="Camera"
                  value={cameraIsLive ? currentCameraLabel : "Standby"}
                />
              </div>
            </div>

            <Button
              className="h-12 w-full touch-manipulation bg-[#52C2C3] text-white shadow-lg shadow-[#52C2C3]/26 hover:bg-[#49b6b7]"
              disabled={submitDisabled}
              type="submit"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BadgeCheck className="size-4" />
              )}
              {submitting ? "Processing" : `${activeMode.label} face`}
            </Button>

            <div className="mt-4 min-h-[220px] flex-1 rounded-[8px] border border-white/70 bg-white/60 p-3 dark:border-[#52C2C3]/14 dark:bg-black/16">
              {result ? (
                <ResultPanel result={result} />
              ) : (
                <EmptyResult mode={mode} />
              )}
            </div>
          </form>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#bde7e8] bg-[#f2fbfa]/96 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-16px_32px_rgba(76,126,126,0.18)] backdrop-blur sm:hidden dark:border-[#52C2C3]/16 dark:bg-[#071d1f]/96">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {modes.map((item) => {
            const Icon = item.Icon
            const selected = item.id === mode

            return (
              <button
                className={cn(
                  "flex h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-[8px] border text-xs font-semibold transition",
                  selected
                    ? "border-[#52C2C3] bg-[#52C2C3] text-white shadow-sm shadow-[#52C2C3]/30"
                    : "border-white/70 bg-white/70 text-[#607878] dark:border-white/10 dark:bg-white/6 dark:text-white/70"
                )}
                key={item.id}
                onClick={() => {
                  setMode(item.id)
                  setResult(null)
                  setNotice("")
                }}
                type="button"
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </main>
  )
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-[#314a4c] dark:text-white/82">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Metric({ label, value }: ResultDetail) {
  return (
    <div className="rounded-[8px] border border-white/70 bg-white/62 px-3 py-2 dark:border-[#52C2C3]/14 dark:bg-white/6">
      <p className="text-xs text-[#657b7b] dark:text-white/52">{label}</p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  )
}



function ResultPanel({ result }: { result: ApiResult }) {
  const Icon = result.tone === "success" ? CheckCircle2 : XCircle

  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[8px] border",
            result.tone === "success" &&
              "border-[#52C2C3]/35 bg-white/70 text-[#52C2C3] dark:border-[#52C2C3]/25 dark:bg-[#0b3235] dark:text-[#52C2C3]",
            result.tone === "warning" &&
              "border-[#f5c04a]/30 bg-[#fff8eb] text-[#9a6714] dark:border-[#f5c04a]/25 dark:bg-[#3b2a09]/34 dark:text-[#ffe08a]",
            result.tone === "danger" &&
              "border-[#ef4444]/25 bg-[#fef2f2] text-[#b91c1c] dark:border-[#f87171]/25 dark:bg-[#450a0a]/30 dark:text-[#fca5a5]"
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{result.title}</h3>
          <p className="text-sm break-words text-[#657b7b] dark:text-white/62">
            {result.message}
          </p>
        </div>
      </div>

      {result.details.length > 0 ? (
        <dl className="grid gap-2">
          {result.details.map((item) => (
            <div
              className="flex min-w-0 items-center justify-between gap-3 rounded-[8px] border border-white/70 bg-white/68 px-3 py-2 text-sm dark:border-[#52C2C3]/14 dark:bg-white/6"
              key={item.label}
            >
              <dt className="shrink-0 text-[#657b7b] dark:text-white/52">
                {item.label}
              </dt>
              <dd className="min-w-0 truncate font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <pre className="hidden max-h-44 overflow-auto rounded-[8px] border border-white/70 bg-white/68 p-3 text-xs leading-relaxed text-[#314a4c] sm:block dark:border-[#52C2C3]/14 dark:bg-black/22 dark:text-white/72">
        {JSON.stringify(result.raw, null, 2)}
      </pre>
    </div>
  )
}

function EmptyResult({ mode }: { mode: VerificationMode }) {
  const title =
    mode === "register"
      ? "Registration response"
      : mode === "identify"
        ? "Identification response"
        : "Verification response"

  return (
    <div className="flex h-full min-h-[196px] flex-col items-center justify-center gap-3 text-center text-[#657b7b] dark:text-white/56">
      <div className="flex size-14 items-center justify-center rounded-full border border-white/70 bg-white/68 text-[#52C2C3] dark:border-[#52C2C3]/18 dark:bg-white/6 dark:text-[#52C2C3]">
        <IdCard className="size-7" />
      </div>
      <div>
        <p className="font-semibold text-[#314a4c] dark:text-white/82">
          {title}
        </p>
        <p className="text-sm">Waiting</p>
      </div>
    </div>
  )
}
