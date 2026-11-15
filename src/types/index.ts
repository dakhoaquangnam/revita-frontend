export interface Specialty {
  id: string;
  specialtyCode: string;
  name: string;
  imgUrl: string | null;
  description: string | null;
}

export interface Doctor {
  id: string;
  name: string;
  avatar: string | null;
  doctor: {
    id: string;
    doctorCode: string;
    yearsExperience: number;
    rating: number;
    workHistory: string | null;
    description: string | null;
  } | null;
}

export interface ClinicRoom {
  id: string;
  roomNumber: string;
  name: string;
  department: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "model" | "assistant";
  content: string;
  timestamp?: string;
}
