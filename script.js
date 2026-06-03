import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_CONFIG } from "./supabase/config.js";

const hasSupabaseConfig =
  Boolean(SUPABASE_CONFIG?.url) &&
  Boolean(SUPABASE_CONFIG?.anonKey) &&
  !SUPABASE_CONFIG.url.includes("TU-PROYECTO") &&
  !SUPABASE_CONFIG.anonKey.includes("TU_SUPABASE");

const supabase = hasSupabaseConfig
  ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : null;

const productosLista = document.querySelector("#productos-lista");

function scrollToProductos(event) {
  const target = document.querySelector("#productos");

  if (!target) {
    return;
  }

  event.preventDefault();
  history.pushState(null, "", "#productos");
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToDashboard(event) {
  const dashboardModal = document.querySelector("#dashboardModal");

  if (!dashboardModal) {
    return;
  }

  event.preventDefault();
  history.pushState(null, "", "#dashboard");
  dashboardModal.classList.add("is-open");
  dashboardModal.setAttribute("aria-hidden", "false");
}

async function cargarProductos() {
  if (!productosLista) {
    return;
  }

  if (!supabase) {
    productosLista.innerHTML = `
      <p>No se pudo conectar con Supabase. Revisa tu archivo supabase/config.js.</p>
    `;
    return;
  }

  productosLista.innerHTML = "<p>Cargando productos...</p>";

  const { data, error } = await supabase
    .from("Producto")
    .select("id, Nombre, Precio, Presentación, Categoría, Imagen_url")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error al cargar productos:", error);
    productosLista.innerHTML = `
      <p>No se pudieron cargar los productos. Revisa la tabla o las políticas RLS.</p>
    `;
    return;
  }

  console.log("Productos cargados:", data);

  if (!data || data.length === 0) {
    productosLista.innerHTML = "<p>No hay productos disponibles.</p>";
    return;
  }

  productosLista.innerHTML = data
    .map((producto) => {
      return `
        <div class="producto-card">
          <img 
            src="${producto.Imagen_url}" 
            alt="${producto.Nombre}" 
            class="producto-img"
          />

          <div class="producto-info">
            <h3>${producto.Nombre}</h3>
            <p>${producto["Presentación"]}</p>
            <span class="producto-categoria">${producto["Categoría"]}</span>
            <h4>C$${producto.Precio}</h4>

            <button 
              class="btn-3 agregar-carrito"
              data-id="${producto.id}"
              data-nombre="${producto.Nombre}"
              data-precio="${producto.Precio}"
            >
              Agregar al carrito
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

cargarProductos();

document.querySelectorAll("a").forEach((link) => {
  if (link.textContent?.trim() === "Productos") {
    link.addEventListener("click", scrollToProductos);
  }
});

document.querySelectorAll(".open-dashboard").forEach((link) => {
  link.addEventListener("click", scrollToDashboard);
});

const dashboardModal = document.querySelector("#dashboardModal");

function closeDashboard() {
  if (!dashboardModal) {
    return;
  }

  dashboardModal.classList.remove("is-open");
  dashboardModal.setAttribute("aria-hidden", "true");
}

dashboardModal?.querySelectorAll("[data-dashboard-close]").forEach((element) => {
  element.addEventListener("click", closeDashboard);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDashboard();
  }
});

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
const discountForm = document.querySelector("#discountForm");
const discountFeedbackElement = document.querySelector("#discount-feedback");
const discountSubmitButton = document.querySelector(
  'button[type="submit"][form="discountForm"]',
);
const defaultDiscountButtonLabel =
  discountSubmitButton?.textContent ?? "Quiero mi descuento";

function setElementFeedback(element, message, state = "") {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = "form-feedback";

  if (state) {
    element.classList.add(`is-${state}`);
  }
}

function setFeedback(message, state = "") {
  setElementFeedback(feedbackElement, message, state);
}

function setDiscountFeedback(message, state = "") {
  setElementFeedback(discountFeedbackElement, message, state);
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
    Teléfono: formData.get("phone")?.toString().trim() || null,
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
    const errorParts = [error.message, error.details, error.hint].filter(
      Boolean,
    );
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

async function handleDiscountSubmit(event) {
  event.preventDefault();

  if (!discountForm || !discountSubmitButton) {
    return;
  }

  if (!supabase) {
    setDiscountFeedback(
      "Configura tu proyecto en supabase/config.js antes de enviar el formulario.",
      "error",
    );
    return;
  }

  const formData = new FormData(discountForm);
  const payload = {
    Nombre: formData.get("nombre")?.toString().trim(),
    Edad: Number(formData.get("edad")),
    Género: formData.get("genero")?.toString().trim(),
    Teléfono: formData.get("telefono")?.toString().trim(),
    Conducta_online: formData.get("conducta_online")?.toString().trim(),
    Intereses: formData.get("intereses")?.toString().trim(),
    Frecuencia_de_consumo: formData
      .get("frecuencia_de_consumo")
      ?.toString()
      .trim(),
    Dirección: formData.get("direccion")?.toString().trim(),
  };

  if (
    !payload.Nombre ||
    !Number.isFinite(payload.Edad) ||
    payload.Edad < 1 ||
    !payload["Género"] ||
    !payload["Teléfono"] ||
    !payload.Conducta_online ||
    !payload.Intereses ||
    !payload.Frecuencia_de_consumo ||
    !payload["Dirección"]
  ) {
    setDiscountFeedback(
      "Completa todos los campos obligatorios para continuar.",
      "error",
    );
    return;
  }

  if (payload.Edad < 40 || payload.Edad > 70) {
    setDiscountFeedback(
      "El descuento solo aplica para clientes entre 40 y 70 años.",
      "error",
    );
    return;
  }

  discountSubmitButton.disabled = true;
  discountSubmitButton.textContent = "Enviando...";
  setDiscountFeedback("Enviando tu registro...", "pending");

  const { error } = await supabase.from("Descuento").insert(payload);

  discountSubmitButton.disabled = false;
  discountSubmitButton.textContent = defaultDiscountButtonLabel;

  if (error) {
    console.error("Supabase insert error:", error);
    const errorParts = [error.message, error.details, error.hint].filter(
      Boolean,
    );
    setDiscountFeedback(
      `No pudimos registrar tu descuento. ${errorParts.join(" | ") || "Revisa la tabla y la policy de Supabase."}`,
      "error",
    );
    return;
  }

  discountForm.reset();
  setDiscountFeedback(
    "Registro enviado con éxito. Pronto recibirás promociones y descuentos.",
    "success",
  );
  setTimeout(() => {
    setDiscountFeedback("", "");
    try {
      if (discountModal) {
        discountModal.classList.remove("show");
      }
    } catch (e) {
      // no-op
    }
  }, 4000);
}

discountForm?.addEventListener("submit", handleDiscountSubmit);

const openDiscountModal = document.getElementById("openDiscountModal");
const closeDiscountModal = document.getElementById("closeDiscountModal");
const discountModal = document.getElementById("discountModal");

openDiscountModal?.addEventListener("click", () => {
  discountModal?.classList.add("show");
});

closeDiscountModal?.addEventListener("click", () => {
  discountModal?.classList.remove("show");
});

discountModal?.addEventListener("click", (event) => {
  if (event.target === discountModal) {
    discountModal.classList.remove("show");
  }
});
