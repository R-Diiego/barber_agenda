export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
}

export interface Appointment {
  id: string;
  clientName: string;
  serviceName: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:mm format
}

export type ModalMode = 'closed' | 'create' | 'edit' | 'delete' | 'settings';