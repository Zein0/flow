import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarOpen: false,
  selectedDate: new Date(),
  selectedPatient: null,
  selectedDoctor: null,
  bookingModalOpen: false,
  paymentModalOpen: false,
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedPatient: (patient) => set({ selectedPatient: patient }),
  setSelectedDoctor: (doctor) => set({ selectedDoctor: doctor }),
  setBookingModalOpen: (open) => set({ bookingModalOpen: open }),
  setPaymentModalOpen: (open) => set({ paymentModalOpen: open }),
  
  resetSelection: () => set({
    selectedPatient: null,
    selectedDoctor: null
  })
}));