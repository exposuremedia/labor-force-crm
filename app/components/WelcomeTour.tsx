"use client";
import { useEffect, useRef, useState } from "react";
const steps = [
  ["Welcome to LaborForceLink", "This is where you review crew applications and keep track of each crew’s progress."],
  ["Contacts", "Open Contacts to see applications. Search by name, email, phone, or company. Select a contact to open their full application."],
  ["Find the right crews", "Use the trade, language, status, location, and tag filters. Locations and tags appear when applications include them."],
  ["Crew pipeline", "Open Pipeline to follow applications from New Application through review, approval, and Active Crew. Drag a crew card to update its stage."],
  ["Add an opportunity", "Use Add opportunity to enter a crew manually, choose a pipeline stage, and record its source."],
  ["Application details and notes", "Open a contact to review their application answers, edit details, and add notes. You can reopen this walkthrough from the sidebar anytime."],
];
export function WelcomeTour({ userEmail }: { userEmail: string }) {
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const key = `lfl-tour-v1:${userEmail}`;
  useEffect(() => { try { if (!localStorage.getItem(key)) dialog.current?.showModal(); } catch {} }, [key]);
  function finish() { try { localStorage.setItem(key, "seen"); } catch {} dialog.current?.close(); }
  return <>
    <button type="button" className="em-sidebar-link" onClick={() => { setStep(0); dialog.current?.showModal(); }}>Quick walkthrough</button>
    <dialog ref={dialog} onCancel={finish} style={{ margin: "auto", width: "min(520px, calc(100% - 32px))", padding: 28, background: "#1a1a1a", color: "white", border: "1px solid #baf70355", borderRadius: 6 }} aria-labelledby="tour-title">
      <p style={{ color: "#baf703", fontSize: 12, letterSpacing: 2, marginBottom: 18 }}>GETTING STARTED · {step + 1} / {steps.length}</p>
      <h2 id="tour-title" style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase" }}>{steps[step][0]}</h2>
      <p style={{ fontSize: 16, lineHeight: 1.7, margin: "20px 0 28px" }}>{steps[step][1]}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button className="btn-ghost" onClick={finish}>Skip tour</button>
        {step > 0 && <button className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
        <button className="btn-primary" style={{ marginLeft: "auto" }} onClick={() => step === steps.length - 1 ? finish() : setStep(step + 1)}>{step === steps.length - 1 ? "Get started" : "Next"}</button>
      </div>
    </dialog>
  </>;
}
