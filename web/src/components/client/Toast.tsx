"use client";
import { useEffect, useState } from "react";

export function Toast() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const on = (e: Event) => {
      setMsg(String((e as CustomEvent).detail || ""));
      setShow(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShow(false), 4200);
    };
    window.addEventListener("lakorn:toast", on);
    return () => { window.removeEventListener("lakorn:toast", on); clearTimeout(timer); };
  }, []);
  return <div className={`toast${show ? " show" : ""}`} id="toast" role="status" aria-live="polite">{msg}</div>;
}
