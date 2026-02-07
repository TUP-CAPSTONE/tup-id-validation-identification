"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { majorOffenses, minorOffenses, Offense } from "@/lib/offense-data";

interface StudentHandbookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentHandbookDialog({ open, onOpenChange }: StudentHandbookDialogProps) {
  const [offenseType, setOffenseType] = useState<"major" | "minor">("major");
  const [selectedOffense, setSelectedOffense] = useState<string>("");
  const offenseRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentOffenses = offenseType === "major" ? majorOffenses : minorOffenses;

  // Reset selected offense when offense type changes
  useEffect(() => {
    setSelectedOffense("");
  }, [offenseType]);

  // Scroll to selected offense
  useEffect(() => {
    if (selectedOffense && offenseRefs.current[selectedOffense]) {
      offenseRefs.current[selectedOffense]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedOffense]);

  const handleOffenseTypeChange = (value: "major" | "minor") => {
    setOffenseType(value);
  };

  const handleOffenseSelect = (value: string) => {
    setSelectedOffense(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[500vw] h-[90vh] max-w-none max-h-none flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-bold text-red-700">
            TUP Student Handbook - Rules on Conduct & Discipline
          </DialogTitle>
          <DialogDescription className="text-xs">
            Official list of offenses and corresponding sanctions
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Selectors */}
          <div className="space-y-3 flex-shrink-0">
            {/* Offense Type Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                Offense Type:
              </label>
              <Select value={offenseType} onValueChange={handleOffenseTypeChange}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="major">Major Offenses</SelectItem>
                  <SelectItem value="minor">Minor Offenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Jump to Offense Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                Jump to:
              </label>
              <Select value={selectedOffense} onValueChange={handleOffenseSelect}>
                <SelectTrigger className="w-[240px] h-9 text-sm">
                  <SelectValue placeholder="Select offense number" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {currentOffenses.map((offense) => (
                    <SelectItem key={offense.number} value={offense.number}>
                      #{offense.number} - {offense.title.length > 30 ? offense.title.substring(0, 30) + "..." : offense.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Offenses List */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pr-4 min-h-0">
            <div className="space-y-3">
              {currentOffenses.map((offense) => (
                <div
                  key={offense.number}
                  ref={(el) => {
                    offenseRefs.current[offense.number] = el;
                  }}
                  className={`border rounded-lg p-3 bg-white shadow-sm transition-all ${
                    selectedOffense === offense.number
                      ? "border-red-500 border-2 shadow-md"
                      : "border-gray-300"
                  }`}
                >
                  {/* Offense Header */}
                  <div className="mb-2">
                    <div className="flex items-start gap-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        offenseType === "major"
                          ? "bg-red-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}>
                        {offense.number}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 flex-1 mt-0.5">
                        {offense.title}
                      </h3>
                    </div>
                  </div>

                  {/* Offense Items */}
                  {offense.items && offense.items.length > 0 && (
                    <div className="mb-2 ml-8">
                      <ul className="list-disc list-outside space-y-0.5 text-xs text-gray-700">
                        {offense.items.map((item, idx) => (
                          <li key={idx} className="pl-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sanctions */}
                  <div className="ml-8 mt-2 pt-2 border-t border-gray-200">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                      Sanctions:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 text-xs">
                      {offense.sanctions.first && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-1.5">
                          <div className="font-semibold text-yellow-800 mb-0.5 text-xs">
                            1st Offense:
                          </div>
                          <div className="text-gray-700 text-xs">{offense.sanctions.first}</div>
                        </div>
                      )}
                      {offense.sanctions.second && (
                        <div className="bg-orange-50 border border-orange-200 rounded p-1.5">
                          <div className="font-semibold text-orange-800 mb-0.5 text-xs">
                            2nd Offense:
                          </div>
                          <div className="text-gray-700 text-xs">{offense.sanctions.second}</div>
                        </div>
                      )}
                      {offense.sanctions.third && (
                        <div className="bg-red-50 border border-red-200 rounded p-1.5">
                          <div className="font-semibold text-red-800 mb-0.5 text-xs">
                            3rd Offense:
                          </div>
                          <div className="text-gray-700 text-xs">{offense.sanctions.third}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-xs text-gray-500 italic border-t pt-2 flex-shrink-0">
            {offenseType === "major" ? (
              <p>
                <strong>Note:</strong> For TAGUIG/VISAYAS CAMPUSES ON TRIMESTER BASIS: 
                30 Days Suspension = 23 days Suspension; 
                15 Days Suspension = 12 days suspension
              </p>
            ) : (
              <p>
                <strong>Note:</strong> For TAGUIG/VISAYAS CAMPUSES ON TRIMESTER BASIS: 
                1st Offense - Warning, a Letter of Apology countersigned by the parent/guardian; 
                2nd Offense - 10 to 15 hours; 
                3rd Offense - 20 to 40 hours for the 3rd offense
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
