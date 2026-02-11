"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react"

interface ConfirmationStep {
  title: string
  description: string
  type: "warning" | "danger" | "info"
  bullets?: string[]
  checklist?: string[]
}

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  steps: ConfirmationStep[]
  confirmText?: string
  cancelText?: string
  requiresTyping?: boolean
  typingText?: string
  isLoading?: boolean
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  steps,
  confirmText = "Confirm",
  cancelText = "Cancel",
  requiresTyping = false,
  typingText = "DELETE",
  isLoading = false,
}: ConfirmationDialogProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [typedText, setTypedText] = useState("")
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())

  // Reset state when dialog opens/closes or step changes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0)
      setTypedText("")
      setCheckedItems(new Set())
    }
  }, [isOpen])

  // Reset checked items when step changes
  useEffect(() => {
    setCheckedItems(new Set())
    setTypedText("")
  }, [currentStep])

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const hasChecklist = currentStepData.checklist && currentStepData.checklist.length > 0
  const allChecklistItemsChecked = hasChecklist
    ? checkedItems.size === currentStepData.checklist!.length
    : true

  const canProceed = requiresTyping && isLastStep
    ? typedText === typingText && allChecklistItemsChecked
    : allChecklistItemsChecked

  const handleNext = () => {
    if (isLastStep && canProceed) {
      onConfirm()
    } else if (!isLastStep) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(0)
    setTypedText("")
    setCheckedItems(new Set())
    onClose()
  }

  const toggleChecklistItem = (index: number) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(index)) {
      newChecked.delete(index)
    } else {
      newChecked.add(index)
    }
    setCheckedItems(newChecked)
  }

  const getIcon = () => {
    switch (currentStepData.type) {
      case "danger":
        return <AlertTriangle className="h-12 w-12 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-12 w-12 text-amber-500" />
      case "info":
        return <Info className="h-12 w-12 text-blue-500" />
    }
  }

  const getBgColor = () => {
    switch (currentStepData.type) {
      case "danger":
        return "bg-red-50 border-red-200"
      case "warning":
        return "bg-amber-50 border-amber-200"
      case "info":
        return "bg-blue-50 border-blue-200"
    }
  }

  const getTextColor = () => {
    switch (currentStepData.type) {
      case "danger":
        return "text-red-900"
      case "warning":
        return "text-amber-900"
      case "info":
        return "text-blue-900"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="shrink-0 mt-1">{getIcon()}</div>
            <div className="flex-1">
              <DialogTitle className={`text-2xl font-bold ${getTextColor()}`}>
                {currentStepData.title}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {currentStepData.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step Progress Indicator */}
          {steps.length > 1 && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? "w-8 bg-red-500"
                      : index < currentStep
                      ? "w-2 bg-red-300"
                      : "w-2 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Bullet Points */}
          {currentStepData.bullets && currentStepData.bullets.length > 0 && (
            <div className={`p-4 rounded-lg border ${getBgColor()}`}>
              <ul className="space-y-3">
                {currentStepData.bullets.map((bullet, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className={`text-lg font-bold ${getTextColor()} mt-0.5`}>•</span>
                    <span className={`${getTextColor()} flex-1`}>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Checklist */}
          {currentStepData.checklist && currentStepData.checklist.length > 0 && (
            <div className={`p-4 rounded-lg border ${getBgColor()}`}>
              <p className={`font-semibold mb-3 ${getTextColor()}`}>
                Please confirm you understand:
              </p>
              <div className="space-y-3">
                {currentStepData.checklist.map((item, index) => (
                  <label
                    key={index}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={checkedItems.has(index)}
                      onChange={() => toggleChecklistItem(index)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <span className={`flex-1 ${getTextColor()} group-hover:font-medium transition-all`}>
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Typing Confirmation */}
          {requiresTyping && isLastStep && (
            <div className="space-y-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  To confirm this action, please type{" "}
                  <code className="px-2 py-1 bg-red-100 text-red-700 rounded font-mono font-bold">
                    {typingText}
                  </code>{" "}
                  below:
                </p>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                  placeholder={`Type "${typingText}" to confirm`}
                  autoComplete="off"
                />
                {typedText && typedText !== typingText && (
                  <p className="text-sm text-red-600 mt-2">
                    Text doesn't match. Please type exactly: {typingText}
                  </p>
                )}
                {typedText === typingText && (
                  <div className="flex items-center gap-2 text-green-600 mt-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="text-sm font-medium">Confirmed</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          {!isLastStep ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!allChecklistItemsChecked}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Next Step
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed || isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Processing..." : confirmText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}