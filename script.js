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
const cartStorageKey = "farmaciaAngeluzCarrito";
const whatsappOrderNumber = "50584284943";
const cartButton = document.querySelector(".cart-button");
const cartContainer = document.querySelector("#carrito");
const cartCountElement = document.querySelector("#cart-count");
const cartTableBody = document.querySelector("#lista-carrito tbody");
const cartTotalElement = document.querySelector("#cart-total");
const checkoutCartButton = document.querySelector("#comprar-carrito");
const emptyCartButton = document.querySelector("#vaciar-carrito");

function parsePrice(value) {
  const cleanValue = String(value ?? "0")
    .replace(/[^\d.,-]/g, "")
    .trim();
  const normalizedValue =
    cleanValue.includes(".") && cleanValue.includes(",")
      ? cleanValue.replace(/,/g, "")
      : cleanValue.replace(",", ".");
  const price = Number(normalizedValue);

  return Number.isFinite(price) ? price : 0;
}

function formatCordobas(value) {
  return `C$${Number(value).toFixed(2)}`;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function getSavedCart() {
  try {
    const savedCart = window.localStorage.getItem(cartStorageKey);
    const parsedCart = JSON.parse(savedCart);

    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart
      .filter((item) => item?.id && item?.name)
      .map((item) => ({
        id: String(item.id),
        name: String(item.name),
        price: parsePrice(item.price),
        quantity: Math.max(1, Number(item.quantity) || 1),
      }));
  } catch (error) {
    console.warn("No se pudo leer el carrito guardado:", error);
    return [];
  }
}

let cartItems = getSavedCart();

function saveCart() {
  try {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  } catch (error) {
    console.warn("No se pudo guardar el carrito:", error);
  }
}

function renderCart() {
  const totalQuantity = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  if (cartCountElement) {
    cartCountElement.textContent = String(totalQuantity);
    cartCountElement.classList.toggle("is-visible", totalQuantity > 0);
  }

  if (cartTotalElement) {
    cartTotalElement.textContent = formatCordobas(cartTotal);
  }

  if (!cartTableBody) {
    return;
  }

  if (cartItems.length === 0) {
    cartTableBody.innerHTML = `
      <tr>
        <td class="cart-empty" colspan="4">Tu carrito está vacío.</td>
      </tr>
    `;
    return;
  }

  cartTableBody.innerHTML = cartItems
    .map((item) => {
      return `
        <tr>
          <td>
            <span class="cart-product-name">${escapeHtml(item.name)}</span>
            <small>${formatCordobas(item.price)} c/u</small>
          </td>
          <td>
            <div class="cart-quantity">
              <button
                class="cart-quantity-btn"
                type="button"
                data-cart-action="decrease"
                data-id="${escapeHtml(item.id)}"
                aria-label="Quitar una unidad de ${escapeHtml(item.name)}"
              >
                -
              </button>
              <span>${item.quantity}</span>
              <button
                class="cart-quantity-btn"
                type="button"
                data-cart-action="increase"
                data-id="${escapeHtml(item.id)}"
                aria-label="Agregar una unidad de ${escapeHtml(item.name)}"
              >
                +
              </button>
            </div>
          </td>
          <td>${formatCordobas(item.price * item.quantity)}</td>
          <td>
            <button
              class="cart-remove"
              type="button"
              data-cart-action="remove"
              data-id="${escapeHtml(item.id)}"
              aria-label="Eliminar ${escapeHtml(item.name)}"
            >
              ×
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function trackAddToCart(product) {
  if (typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "add_to_cart", {
    currency: "NIO",
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: 1,
      },
    ],
    transport_type: "beacon",
  });
}

function trackBeginCheckout(cartTotal) {
  if (typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "begin_checkout", {
    currency: "NIO",
    value: cartTotal,
    items: cartItems.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
    transport_type: "beacon",
  });
}

function addProductToCart(product) {
  const existingItem = cartItems.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cartItems.push({ ...product, quantity: 1 });
  }

  saveCart();
  renderCart();
  trackAddToCart(product);
}

function handleProductCartClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest(".agregar-carrito");

  if (!button) {
    return;
  }

  const product = {
    id: String(button.dataset.id),
    name: button.dataset.nombre,
    price: parsePrice(button.dataset.precio),
  };

  if (!product.id || !product.name) {
    return;
  }

  addProductToCart(product);

  const originalText = button.textContent;
  button.textContent = "Agregado";
  button.classList.add("is-added");

  window.setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove("is-added");
  }, 1200);
}

function updateCartItemQuantity(productId, change) {
  const item = cartItems.find((cartItem) => cartItem.id === productId);

  if (!item) {
    return;
  }

  item.quantity += change;

  if (item.quantity <= 0) {
    cartItems = cartItems.filter((cartItem) => cartItem.id !== productId);
  }

  saveCart();
  renderCart();
}

function handleCartActionClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest("[data-cart-action]");

  if (!button) {
    return;
  }

  const productId = button.dataset.id;

  if (!productId) {
    return;
  }

  if (button.dataset.cartAction === "increase") {
    updateCartItemQuantity(productId, 1);
    return;
  }

  if (button.dataset.cartAction === "decrease") {
    updateCartItemQuantity(productId, -1);
    return;
  }

  if (button.dataset.cartAction === "remove") {
    cartItems = cartItems.filter((item) => item.id !== productId);
    saveCart();
    renderCart();
  }
}

productosLista?.addEventListener("click", handleProductCartClick);

cartTableBody?.addEventListener("click", handleCartActionClick);

cartButton?.addEventListener("click", (event) => {
  event.preventDefault();
  cartButton.closest(".submenu")?.classList.toggle("is-open");
});

checkoutCartButton?.addEventListener("click", (event) => {
  event.preventDefault();

  if (cartItems.length === 0) {
    window.alert("Agrega al menos un producto antes de comprar.");
    return;
  }

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const orderLines = cartItems
    .map((item) => {
      return `- ${item.quantity} x ${item.name} (${formatCordobas(item.price)} c/u) = ${formatCordobas(item.price * item.quantity)}`;
    })
    .join("\n");
  const message = [
    "Hola Farmacia Angeluz, quiero comprar estos productos:",
    "",
    orderLines,
    "",
    `Total: ${formatCordobas(cartTotal)}`,
    "",
    "¿Me ayudan a confirmar disponibilidad y entrega?",
  ].join("\n");
  const whatsappUrl = `https://wa.me/${whatsappOrderNumber}?text=${encodeURIComponent(message)}`;

  trackBeginCheckout(cartTotal);
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
});

emptyCartButton?.addEventListener("click", (event) => {
  event.preventDefault();
  cartItems = [];
  saveCart();
  renderCart();
});

renderCart();

function trackSocialClick(event) {
  const link = event.currentTarget;

  if (!(link instanceof HTMLAnchorElement)) {
    return;
  }

  const socialNetwork = link.dataset.gaSocial;

  if (!socialNetwork || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", `click_${socialNetwork}`, {
    event_category: "redes_sociales",
    event_label: socialNetwork,
    social_network: socialNetwork,
    button_location: link.dataset.gaLocation || "unknown",
    link_url: link.href,
    transport_type: "beacon",
  });
}

document.querySelectorAll("[data-ga-social]").forEach((link) => {
  link.addEventListener("click", trackSocialClick);
});

function trackCarouselClick(event) {
  const image = event.currentTarget;

  if (!(image instanceof HTMLImageElement)) {
    return;
  }

  const carouselPosition = image.dataset.gaCarousel;

  if (!carouselPosition || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", `click_carrusel_${carouselPosition}`, {
    event_category: "carrusel",
    event_label: image.dataset.gaCarouselName || `Carrusel ${carouselPosition}`,
    carousel_position: carouselPosition,
    carousel_image: image.getAttribute("src") || "",
    transport_type: "beacon",
  });
}

document.querySelectorAll("[data-ga-carousel]").forEach((image) => {
  image.addEventListener("click", trackCarouselClick);
});

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
