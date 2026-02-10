export interface StudentProfile {
  uid: string;
  email: string;
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  studentNumber?: string;
  tup_id?: string;
  studentId?: string;
  phone?: string;
  student_phone_num?: string;
  guardianEmail?: string;
  guardian_email?: string;
  role: string;
}

export interface ValidationRequest {
  studentId: string;
  tupId: string;
  studentName: string;
  email: string;
  phoneNumber: string;
  course: string;
  section: string;
  yearLevel: string;
  cor: string; // Firebase Storage URL
  idPicture: string; // Firebase Storage URL
  selfiePictures: {
    front: string;
    left: string;
    back: string;
  };
  status: 'pending' | 'accepted' | 'rejected';
  requestTime: any; // Firestore Timestamp
  rejectRemarks?: string | null;
}

export interface ValidationRequestResponse {
  success: boolean;
  message: string;
  data?: ValidationRequest;
  error?: string;
}

export interface StudentProfileResponse {
  success: boolean;
  message: string;
  data?: StudentProfile;
  error?: string;
}

export interface Student {
  uid: string
  tupId: string
  fullName: string
  email: string
  role: "student"
  accountStatus: "active" | "disabled"
  createdAt?: any
  updatedAt?: any
}