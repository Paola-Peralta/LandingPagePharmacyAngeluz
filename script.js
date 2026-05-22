import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_CONFIG } from "./supabase/config.js";

if (document.querySelector(".mySwiper-1") && typeof Swiper !== "undefined") {
  new Swiper(".mySwiper-1", {
    slidesPerView: 1,
    spaceBetween: 30,
    loop: true,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
  });
}

const contactForm = document.querySelector("#contact-form");
const feedbackElement = document.querySelector("#form-feedback");
const submitButton = contactForm?.querySelector('button[type="submit"]');
const defaultButtonLabel = submitButton?.textContent ?? "Enviar mensaje";

const hasSupabaseConfig =
  Boolean(SUPABASE_CONFIG?.url) &&
  Boolean(SUPABASE_CONFIG?.anonKey) &&
  !SUPABASE_CONFIG.url.includes("TU-PROYECTO") &&
  !SUPABASE_CONFIG.anonKey.includes("TU_SUPABASE");

const supabase = hasSupabaseConfig
  ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : null;

function setFeedback(message, state = "") {
  if (!feedbackElement) {
    return;
  }

  feedbackElement.textContent = message;
  feedbackElement.className = "form-feedback";

  if (state) {
    feedbackElement.classList.add(`is-${state}`);
  }
}

async function handleContactSubmit(event) {
  event.preventDefault();

  if (!contactForm || !submitButton) {
    return;
  }

  if (!supabase) {
    setFeedback(
      "Configura tu proyecto en supabase/config.js antes de enviar el formulario.",
      "error",
    );
    return;
  }

  const formData = new FormData(contactForm);
  const payload = {
    Nombre: formData.get("full_name")?.toString().trim(),
    correo: formData.get("email")?.toString().trim(),
    "Teléfono": formData.get("phone")?.toString().trim() || null,
    Mensaje: formData.get("message")?.toString().trim(),
  };

  if (!payload.Nombre || !payload.correo || !payload.Mensaje) {
    setFeedback("Completa los campos obligatorios para continuar.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";
  setFeedback("Enviando tu mensaje...", "pending");

  const { error } = await supabase.from("contactos").insert(payload);

  submitButton.disabled = false;
  submitButton.textContent = defaultButtonLabel;

  if (error) {
    console.error("Supabase insert error:", error);
    const errorParts = [error.message, error.details, error.hint].filter(Boolean);
    setFeedback(
      `No pudimos enviar tu mensaje. ${errorParts.join(" | ") || "Revisa la tabla y la policy de Supabase."}`,
      "error",
    );
    return;
  }

  contactForm.reset();
  setFeedback("Mensaje enviado con éxito. Te responderemos pronto.", "success");
}

contactForm?.addEventListener("submit", handleContactSubmit);
