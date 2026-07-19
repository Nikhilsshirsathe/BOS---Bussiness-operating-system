"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Clock, Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { Business, BrandSettings, Service, TimeSlot } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  business: Business;
  brand: BrandSettings | null;
  onBack: () => void;
}

type Step = "service" | "date" | "time" | "details" | "confirm" | "success";

export default function PublicBooking({ business, brand, onBack }: Props) {
  const primaryColor = brand?.primary_color ?? "#6366f1";

  const [step, setStep]         = useState<Step>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots]       = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [calendarBase, setCalendarBase] = useState(new Date());
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking]   = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load services
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("sort_order")
        .limit(20);
      setServices((data ?? []) as Service[]);
      // If no services, skip service step
      if (!data || data.length === 0) setStep("date");
    };
    load();
  }, [business.id]);

  // Load slots when date selected
  useEffect(() => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    const supabase = createClient();
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    supabase
      .rpc("get_available_slots", { p_business_id: business.id, p_date: dateStr })
      .then(({ data }) => {
        setSlots((data ?? []) as TimeSlot[]);
        setSlotsLoading(false);
      });
  }, [selectedDate, business.id]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Valid email required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const bookAppointment = async () => {
    if (!validate() || !selectedSlot || !selectedDate) return;
    setBooking(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc("book_appointment_rpc", {
        p_business_id: business.id,
        p_customer_name: form.name,
        p_customer_email: form.email,
        p_customer_phone: form.phone || null,
        p_appointment_time: selectedSlot.slot_time,
        p_duration_minutes: selectedService?.duration_minutes ?? 30,
        p_service: selectedService?.name ?? null,
      });
    setBooking(false);
    if (error) { alert("Booking failed. Please try again."); return; }
    setAppointmentId(data as string);
    setStep("success");
  };

  // Generate 30 days of dates for calendar
  const today = new Date();
  const dateRange = Array.from({ length: 7 }, (_, i) => addDays(calendarBase, i));

  const availableSlots = slots.filter((s) => s.is_available);

  const progressStep = { service: 1, date: 2, time: 3, details: 4, confirm: 5, success: 5 }[step];
  const totalSteps = services.length > 0 ? 4 : 3;

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: primaryColor }}>
        <button onClick={() => {
          if (step === "service" || step === "date") { onBack(); return; }
          if (step === "time") setStep("date");
          else if (step === "details") setStep("time");
          else if (step === "confirm") setStep("details");
        }} className="p-1 rounded-full hover:bg-white/20">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="font-semibold text-sm">Book Appointment</p>
          {step !== "success" && (
            <p className="text-xs text-white/80">Step {progressStep} of {totalSteps}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {step !== "success" && (
        <div className="w-full bg-muted h-1">
          <div
            className="h-1 transition-all"
            style={{ width: `${(progressStep / totalSteps) * 100}%`, backgroundColor: primaryColor }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">

        {/* ── Step: Select Service ── */}
        {step === "service" && services.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Choose a service</h2>
            <div className="space-y-2">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => { setSelectedService(svc); setStep("date"); }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <div>
                    <p className="font-semibold text-sm">{svc.name}</p>
                    {svc.description && <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock size={11} /> {svc.duration_minutes} min
                    </p>
                  </div>
                  {svc.price != null && (
                    <p className="text-sm font-bold ml-4 shrink-0" style={{ color: primaryColor }}>
                      {svc.currency} {svc.price.toLocaleString()}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Select Date ── */}
        {step === "date" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Choose a date</h2>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setCalendarBase((d) => addDays(d, -7))} className="p-2 rounded-full hover:bg-muted">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium">{format(calendarBase, "MMMM yyyy")}</span>
              <button onClick={() => setCalendarBase((d) => addDays(d, 7))} className="p-2 rounded-full hover:bg-muted">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} className="text-center text-xs text-muted-foreground py-1 font-medium">{d}</div>
              ))}
              {dateRange.map((date) => {
                const isPast = date < today && !isSameDay(date, today);
                const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                return (
                  <button
                    key={date.toISOString()}
                    disabled={isPast}
                    onClick={() => { setSelectedDate(date); setSlots([]); setSelectedSlot(null); setStep("time"); }}
                    className={cn(
                      "aspect-square rounded-full text-sm font-medium transition-all",
                      isPast ? "text-muted-foreground/30 cursor-not-allowed" : "hover:bg-muted",
                      isSelected ? "text-white" : "",
                      isSameDay(date, today) && !isSelected ? "border font-bold" : ""
                    )}
                    style={isSelected ? { backgroundColor: primaryColor } : {}}
                  >
                    {format(date, "d")}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step: Select Time ── */}
        {step === "time" && selectedDate && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Choose a time</h2>
            <p className="text-sm text-muted-foreground">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
            {slotsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No available slots on this date.</p>
                <button onClick={() => setStep("date")} className="text-primary text-sm mt-2 underline">Pick another date</button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot) => {
                  const t = format(parseISO(slot.slot_time), "h:mm a");
                  const isSelected = selectedSlot?.slot_time === slot.slot_time;
                  return (
                    <button
                      key={slot.slot_time}
                      onClick={() => { setSelectedSlot(slot); setStep("details"); }}
                      className={cn(
                        "py-2.5 rounded-xl border text-sm font-medium transition-all",
                        isSelected ? "text-white border-transparent" : "hover:border-primary hover:bg-primary/5"
                      )}
                      style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Your Details ── */}
        {step === "details" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Your details</h2>
            {[
              { key: "name", label: "Full Name", type: "text", placeholder: "Your name", required: true },
              { key: "email", label: "Email Address", type: "email", placeholder: "you@email.com", required: true },
              { key: "phone", label: "Phone Number", type: "tel", placeholder: "+91 99999 99999", required: false },
              { key: "notes", label: "Notes (optional)", type: "text", placeholder: "Any special requests?", required: false },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className={cn(
                    "w-full px-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2",
                    formErrors[field.key] ? "border-destructive" : ""
                  )}
                  style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
                />
                {formErrors[field.key] && <p className="text-xs text-destructive mt-1">{formErrors[field.key]}</p>}
              </div>
            ))}
            <button
              onClick={() => { if (validate()) setStep("confirm"); }}
              className="w-full py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 mt-2"
              style={{ backgroundColor: primaryColor }}
            >
              Review Booking →
            </button>
          </div>
        )}

        {/* ── Step: Confirm ── */}
        {step === "confirm" && selectedDate && selectedSlot && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Confirm Booking</h2>
            <div className="rounded-xl border bg-card p-4 space-y-3">
              {selectedService && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{selectedService.name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{format(selectedDate, "EEE, MMM d yyyy")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{format(parseISO(selectedSlot.slot_time), "h:mm a")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{form.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{form.email}</span>
              </div>
              {selectedService?.price != null && (
                <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                  <span>Total</span>
                  <span style={{ color: primaryColor }}>{selectedService.currency} {selectedService.price.toLocaleString()}</span>
                </div>
              )}
            </div>
            <button
              onClick={bookAppointment}
              disabled={booking}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {booking ? <><Loader2 size={16} className="animate-spin" />Booking…</> : "Confirm Appointment"}
            </button>
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === "success" && selectedDate && selectedSlot && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: `${primaryColor}20` }}>
              <Check size={36} style={{ color: primaryColor }} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Appointment Confirmed!</h2>
              <p className="text-muted-foreground text-sm">
                A confirmation will be sent to <span className="font-medium">{form.email}</span>
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-left space-y-3">
              <p className="text-sm font-semibold mb-2">{business.business_name}</p>
              {selectedService && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span>{selectedService.name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date & Time</span>
                <span>{format(selectedDate, "EEE MMM d")} · {format(parseISO(selectedSlot.slot_time), "h:mm a")}</span>
              </div>
            </div>
            <button onClick={onBack} className="w-full py-3 rounded-xl border font-medium hover:bg-muted transition-colors">
              ← Back to Business Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
