"use client";

import { useState } from "react";
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

  const currentOffenses = offenseType === "major" ? majorOffenses : minorOffenses;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-700">
            TUP Student Handbook - Rules on Conduct & Discipline
          </DialogTitle>
          <DialogDescription>
            Official list of offenses and corresponding sanctions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Offense Type Selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">
              Select Offense Type:
            </label>
            <Select value={offenseType} onValueChange={(value: "major" | "minor") => setOffenseType(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="major">Major Offenses</SelectItem>
                <SelectItem value="minor">Minor Offenses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Offenses List */}
          <div className="h-[55vh] overflow-y-auto pr-4">
            <div className="space-y-4">
              {currentOffenses.map((offense) => (
                <div
                  key={offense.number}
                  className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm"
                >
                  {/* Offense Header */}
                  <div className="mb-3">
                    <div className="flex items-start gap-2">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        offenseType === "major"
                          ? "bg-red-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}>
                        {offense.number}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 flex-1 mt-1">
                        {offense.title}
                      </h3>
                    </div>
                  </div>

                  {/* Offense Items */}
                  {offense.items && offense.items.length > 0 && (
                    <div className="mb-3 ml-10">
                      <ul className="list-disc list-outside space-y-1 text-sm text-gray-700">
                        {offense.items.map((item, idx) => (
                          <li key={idx} className="pl-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sanctions */}
                  <div className="ml-10 mt-3 pt-3 border-t border-gray-200">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                      Sanctions:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      {offense.sanctions.first && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                          <div className="font-semibold text-yellow-800 mb-1">
                            1st Offense:
                          </div>
                          <div className="text-gray-700">{offense.sanctions.first}</div>
                        </div>
                      )}
                      {offense.sanctions.second && (
                        <div className="bg-orange-50 border border-orange-200 rounded p-2">
                          <div className="font-semibold text-orange-800 mb-1">
                            2nd Offense:
                          </div>
                          <div className="text-gray-700">{offense.sanctions.second}</div>
                        </div>
                      )}
                      {offense.sanctions.third && (
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <div className="font-semibold text-red-800 mb-1">
                            3rd Offense:
                          </div>
                          <div className="text-gray-700">{offense.sanctions.third}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-xs text-gray-500 italic border-t pt-3">
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
