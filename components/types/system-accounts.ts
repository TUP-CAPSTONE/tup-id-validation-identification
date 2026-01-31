export type SystemAccount = {
  uid: string
  email: string
  role: "OSA" | "Gate"
  fullName?: string
  gateName?: string
  location?: string
  deviceID?: string
  createdAt: any
  accountStatus: "active" | "disabled"
}
