import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Appointment, ModalMode, Service } from "./types";
import { TIME_SLOTS, LUNCH_BREAK_SLOTS } from "./constants";
import * as appointmentService from "./services/appointmentService";
import * as settingsService from "./services/settingsService";
import Modal from "./components/Modal";
import {
  CalendarIcon,
  ClockIcon,
  EditIcon,
  PlusIcon,
  ScissorsIcon,
  TrashIcon,
  UserIcon,
  SettingsIcon,
} from "./components/Icons";

const formatDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateForDisplay = (date: Date): string => {
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const AppointmentCard: React.FC<{
  appointment: Appointment;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ appointment, onEdit, onDelete }) => (
  <div className="bg-dark-surface p-4 rounded-lg border border-dark-border flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
    <div className="flex-grow">
      <div className="flex items-center gap-3 mb-2">
        <UserIcon className="w-5 h-5 text-brand-primary" />
        <p className="font-bold text-lg text-white">{appointment.clientName}</p>
      </div>
      <div className="flex items-center gap-3 text-gray-300">
        <ScissorsIcon className="w-5 h-5 text-brand-secondary" />
        <p>{appointment.serviceName}</p>
      </div>
    </div>
    <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex items-center justify-center gap-2 bg-dark-border px-3 py-1 rounded-full text-brand-primary font-semibold">
        <ClockIcon className="w-5 h-5" />
        <span>{appointment.time}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="p-2 rounded-full hover:bg-gray-700 transition-colors"
        >
          <EditIcon className="w-5 h-5 text-blue-400" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-full hover:bg-gray-700 transition-colors"
        >
          <TrashIcon className="w-5 h-5 text-red-500" />
        </button>
      </div>
    </div>
  </div>
);

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [formState, setFormState] = useState({
    clientName: "",
    serviceName: "",
    time: "",
  });
  const [newService, setNewService] = useState({ name: "", duration: 30 });

  const formattedDate = useMemo(() => formatDate(currentDate), [currentDate]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [apps, srvs] = await Promise.all([
      appointmentService.fetchAppointmentsByDate(formattedDate),
      settingsService.getServices(),
    ]);
    setAppointments(apps.sort((a, b) => a.time.localeCompare(b.time)));
    setServices(srvs);

    if (srvs.length > 0 && formState.serviceName === "") {
      setFormState((prev) => ({ ...prev, serviceName: srvs[0].name }));
    }

    setIsLoading(false);
  }, [formattedDate, formState.serviceName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const changeDate = (offset: number) => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + offset);
      return newDate;
    });
  };

  const bookedTimes = useMemo(() => {
    const booked = new Set<string>();
    if (!services.length) return booked;

    appointments.forEach((app) => {
      const service = services.find((s) => s.name === app.serviceName);
      if (!service) return;

      const slotsToBook = service.duration / 30;
      let currentTime = app.time;

      for (let i = 0; i < slotsToBook; i++) {
        booked.add(currentTime);
        const [hour, minute] = currentTime.split(":").map(Number);
        if (minute === 30) {
          currentTime = `${String(hour + 1).padStart(2, "0")}:00`;
        } else {
          currentTime = `${String(hour).padStart(2, "0")}:30`;
        }
      }
    });
    return booked;
  }, [appointments, services]);

  const availableSlots = useMemo(() => {
    const selectedService = services.find(
      (s) => s.name === formState.serviceName
    );
    if (!selectedService || !services.length) return [];

    const requiredSlotsCount = selectedService.duration / 30;

    const unavailableSlots = new Set([...bookedTimes, ...LUNCH_BREAK_SLOTS]);

    if (modalMode === "edit" && selectedAppointment) {
      const originalService = services.find(
        (s) => s.name === selectedAppointment.serviceName
      );
      if (originalService) {
        const originalSlotsCount = originalService.duration / 30;
        let currentSlot = selectedAppointment.time;
        for (let i = 0; i < originalSlotsCount; i++) {
          unavailableSlots.delete(currentSlot);
          const [hour, minute] = currentSlot.split(":").map(Number);
          currentSlot =
            minute === 30
              ? `${String(hour + 1).padStart(2, "0")}:00`
              : `${String(hour).padStart(2, "0")}:30`;
        }
      }
    }

    return TIME_SLOTS.filter((startSlot) => {
      let canFit = true;
      let checkSlot = startSlot;
      for (let i = 0; i < requiredSlotsCount; i++) {
        if (
          unavailableSlots.has(checkSlot) ||
          !TIME_SLOTS.includes(checkSlot)
        ) {
          canFit = false;
          break;
        }
        const [hour, minute] = checkSlot.split(":").map(Number);
        checkSlot =
          minute === 30
            ? `${String(hour + 1).padStart(2, "0")}:00`
            : `${String(hour).padStart(2, "0")}:30`;
      }
      return canFit;
    });
  }, [
    formState.serviceName,
    services,
    bookedTimes,
    modalMode,
    selectedAppointment,
  ]);

  useEffect(() => {
    if (
      (modalMode === "create" || modalMode === "edit") &&
      availableSlots.length > 0 &&
      !availableSlots.includes(formState.time)
    ) {
      setFormState((prev) => ({ ...prev, time: availableSlots[0] }));
    }
  }, [availableSlots, modalMode, formState.time]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleOpenModal = (
    mode: Exclude<ModalMode, "closed">,
    appointment: Appointment | null = null
  ) => {
    setSelectedAppointment(appointment);
    if (mode === "create") {
      const defaultServiceName = services.length > 0 ? services[0].name : "";
      setFormState({
        clientName: "",
        serviceName: defaultServiceName,
        time: "",
      });
    } else if (mode === "edit" && appointment) {
      setFormState({
        clientName: appointment.clientName,
        serviceName: appointment.serviceName,
        time: appointment.time,
      });
    }
    setModalMode(mode);
  };

  const handleCloseModal = () => {
    setModalMode("closed");
    setSelectedAppointment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.time) {
      alert("Nenhum horário disponível para este serviço.");
      return;
    }
    if (modalMode === "create") {
      await appointmentService.addAppointment({
        ...formState,
        date: formattedDate,
      });
    } else if (modalMode === "edit" && selectedAppointment) {
      await appointmentService.updateAppointment(selectedAppointment.id, {
        ...formState,
        date: formattedDate,
      });
    }
    await loadData();
    handleCloseModal();
  };

  const handleDelete = async () => {
    if (selectedAppointment) {
      await appointmentService.deleteAppointment(selectedAppointment.id);
      await loadData();
      handleCloseModal();
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      newService.name.trim() === "" ||
      services.some(
        (s) => s.name.toLowerCase() === newService.name.trim().toLowerCase()
      )
    ) {
      alert("Nome do serviço inválido ou já existente.");
      return;
    }
    await settingsService.addService(newService);
    setNewService({ name: "", duration: 30 });
    const updatedServices = await settingsService.getServices();
    setServices(updatedServices);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (
      window.confirm(
        "Tem certeza que deseja remover este serviço? Isso não removerá agendamentos existentes com este serviço."
      )
    ) {
      await settingsService.deleteService(serviceId);
      const updatedServices = await settingsService.getServices();
      setServices(updatedServices);
    }
  };

  const getModalTitle = () => {
    switch (modalMode) {
      case "create":
        return "Novo Agendamento";
      case "edit":
        return "Editar Agendamento";
      case "delete":
        return "Confirmar Exclusão";
      case "settings":
        return "Configurar Serviços";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col items-center mb-8 relative">
        <img className="w-40" src="Barber1-Photoroom - Copia.png" alt="" />

        <p className="text-gray-400 mt-2">Gestão de agendamentos</p>
        <button
          onClick={() => setModalMode("settings")}
          className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Configurações"
        >
          <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      </header>

      <main>
        <div className="bg-dark-surface p-4 rounded-lg border border-dark-border mb-6 sticky top-4 z-10 backdrop-blur-sm bg-opacity-80">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => changeDate(-1)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition"
            >
              &lt;
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-center text-brand-secondary capitalize">
              {formatDateForDisplay(currentDate)}
            </h2>
            <button
              onClick={() => changeDate(1)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition"
            >
              &gt;
            </button>
          </div>
          <div className="text-center text-gray-300">
            <span className="font-bold text-white">{appointments.length}</span>{" "}
            agendamentos para hoje.
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10">Carregando...</div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((app) => (
              <AppointmentCard
                key={app.id}
                appointment={app}
                onEdit={() => handleOpenModal("edit", app)}
                onDelete={() => handleOpenModal("delete", app)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-dark-border rounded-lg">
            <CalendarIcon className="w-12 h-12 mx-auto text-gray-600" />
            <p className="mt-4 text-gray-400">
              Nenhum agendamento para este dia.
            </p>
          </div>
        )}
      </main>

      <button
        onClick={() => handleOpenModal("create")}
        className="fixed bottom-6 right-6 bg-brand-primary text-dark-bg p-4 rounded-full shadow-lg hover:bg-yellow-300 transition-transform transform hover:scale-110"
        aria-label="Novo Agendamento"
      >
        <PlusIcon className="w-8 h-8" />
      </button>

      <Modal
        isOpen={modalMode !== "closed"}
        onClose={handleCloseModal}
        title={getModalTitle()}
      >
        {modalMode === "create" || modalMode === "edit" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="clientName"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Nome do Cliente
              </label>
              <input
                type="text"
                id="clientName"
                name="clientName"
                value={formState.clientName}
                onChange={handleFormChange}
                required
                className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
              />
            </div>
            <div>
              <label
                htmlFor="serviceName"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Serviço
              </label>
              <select
                id="serviceName"
                name="serviceName"
                value={formState.serviceName}
                onChange={handleFormChange}
                required
                className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.duration} min)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="time"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Horário
              </label>
              <select
                id="time"
                name="time"
                value={formState.time}
                onChange={handleFormChange}
                required
                className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
              >
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))
                ) : (
                  <option disabled>Nenhum horário disponível</option>
                )}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-primary text-dark-bg hover:bg-yellow-300 rounded-md font-semibold transition"
              >
                Salvar
              </button>
            </div>
          </form>
        ) : modalMode === "delete" && selectedAppointment ? (
          <div>
            <p>
              Tem a certeza que deseja excluir o agendamento de{" "}
              <span className="font-bold">
                {selectedAppointment.clientName}
              </span>{" "}
              às <span className="font-bold">{selectedAppointment.time}</span>?
            </p>
            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-md font-semibold transition"
              >
                Excluir
              </button>
            </div>
          </div>
        ) : modalMode === "settings" ? (
          <div>
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-2">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex justify-between items-center bg-dark-bg p-3 rounded-md"
                >
                  <span>
                    {service.name} - {service.duration} min
                  </span>
                  <button onClick={() => handleDeleteService(service.id)}>
                    <TrashIcon className="w-5 h-5 text-red-500 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
            <form
              onSubmit={handleAddService}
              className="space-y-4 border-t border-dark-border pt-4"
            >
              <h3 className="text-lg font-semibold text-brand-secondary">
                Adicionar Novo Serviço
              </h3>
              <div>
                <label
                  htmlFor="newServiceName"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Nome
                </label>
                <input
                  type="text"
                  id="newServiceName"
                  value={newService.name}
                  onChange={(e) =>
                    setNewService((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="newServiceDuration"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Duração (minutos)
                </label>
                <select
                  id="newServiceDuration"
                  value={newService.duration}
                  onChange={(e) =>
                    setNewService((prev) => ({
                      ...prev,
                      duration: parseInt(e.target.value),
                    }))
                  }
                  required
                  className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 focus:ring-brand-primary focus:border-brand-primary"
                >
                  <option value="30">30</option>
                  <option value="60">60</option>
                  <option value="90">90</option>
                  <option value="120">120</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-dark-bg hover:bg-yellow-300 rounded-md font-semibold transition"
                >
                  Adicionar Serviço
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
