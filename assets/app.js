// ====== CONFIG ======
// Cambia este número por el tuyo. Formato internacional sin "+" ni espacios.
// México: 52 + 10 dígitos. Ej: 5215512345678 si usas wa.me directo a WhatsApp.
const WHATSAPP_NUMBER = "+525629404518";

// Moneda MXN
const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

// ====== DATA ======
async function loadProducts() {
  const res = await fetch("data/products.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar products.json");
  return await res.json();
}

// ====== CART ======
const CART_KEY = "toyshop_cart_v1";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || {};
  } catch {
    return {};
  }
}

function setCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(productId, qty = 1) {
  const cart = getCart();
  cart[productId] = (cart[productId] || 0) + qty;
  if (cart[productId] <= 0) delete cart[productId];
  setCart(cart);
}

function updateQty(productId, qty) {
  const cart = getCart();
  if (qty <= 0) delete cart[productId];
  else cart[productId] = qty;
  setCart(cart);
}

function clearCart() {
  setCart({});
}

function cartCount() {
  const cart = getCart();
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

function updateCartBadge() {
  const el = document.getElementById("cartCount");
  if (el) el.textContent = String(cartCount());
}

// Helper: pinta precio normal o precio con "Antes" tachado en rojo
function renderPrice(p) {
  const hasDiscount = Boolean(p.hasDiscount);
  const oldPriceValid = typeof p.oldPrice === "number" && p.oldPrice > p.price;

  if (hasDiscount && oldPriceValid) {
    return `
      <div class="price-box">
        <span class="old-price">Antes ${money(p.oldPrice)}</span>
        <span class="new-price">${money(p.price)}</span>
      </div>
    `;
  }

  return `<span class="new-price">${money(p.price)}</span>`;
}

function renderProductCards(products, container) {
  container.innerHTML = "";
  const cart = getCart();

  for (const p of products) {
    const card = document.createElement("article");
    card.className = "card product";

    const img = document.createElement("div");
    img.className = "product__img";
    img.innerHTML = p.image
      ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">`
      : `<div class="imgph">Sin imagen</div>`;

    const body = document.createElement("div");
    body.className = "product__body";
    body.innerHTML = `
      <div class="product__top">
        <h3 class="product__name">${escapeHtml(p.name)}</h3>
        <div class="product__price">${renderPrice(p)}</div>
      </div>
      <div class="muted small">${escapeHtml(p.category || "")}</div>
      <p class="product__desc">${escapeHtml(p.description || "")}</p>
      <div class="product__actions">
        <button class="btn btn--small" data-add="${p.id}">Agregar</button>
        <span class="muted small">En carrito: <strong>${cart[p.id] || 0}</strong></span>
      </div>
    `;

    card.appendChild(img);
    card.appendChild(body);

    container.appendChild(card);
  }

  container.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-add");
      addToCart(id, 1);
      updateCartBadge();
      // re-render para reflejar conteo
      renderProductCards(products, container);
    });
  });
}


function renderCart(products) {
  const wrap = document.getElementById("cartWrap");
  const cart = getCart();
  const items = Object.entries(cart)
    .map(([id, qty]) => {
      const product = products.find(p => String(p.id) === String(id));
      return product ? { product, qty } : null;
    })
    .filter(Boolean);

  if (items.length === 0) {
    wrap.innerHTML = `
      <div class="empty">
        <h3>Tu carrito está vacío</h3>
        <p class="muted">Ve al catálogo para agregar productos.</p>
        <a class="btn" href="catalogo.html">Ir al catálogo</a>
      </div>
    `;
    document.getElementById("total").textContent = money(0);
    return;
  }

  let total = 0;
  const rows = items.map(({ product, qty }) => {
    const sub = product.price * qty;
    total += sub;
    return `
      <div class="cartrow">
        <div class="cartrow__info">
          <div class="cartrow__name">${escapeHtml(product.name)}</div>
          <div class="muted small">${escapeHtml(product.category || "")}</div>
        </div>

        <div class="cartrow__qty">
          <button class="btn btn--ghost btn--icon" data-dec="${product.id}">-</button>
          <input class="input qty" type="number" min="1" value="${qty}" data-qty="${product.id}" />
          <button class="btn btn--ghost btn--icon" data-inc="${product.id}">+</button>
        </div>

        <div class="cartrow__price">${money(sub)}</div>
        <button class="btn btn--ghost" data-del="${product.id}">Quitar</button>
      </div>
    `;
  }).join("");

  wrap.innerHTML = `<div class="cart">${rows}</div>`;
  document.getElementById("total").textContent = money(total);

  // events
  wrap.querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", e => {
    const id = e.currentTarget.getAttribute("data-inc");
    updateQty(id, (getCart()[id] || 0) + 1);
    renderCart(products);
    updateCartBadge();
  }));
  wrap.querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", e => {
    const id = e.currentTarget.getAttribute("data-dec");
    const cur = getCart()[id] || 1;
    updateQty(id, Math.max(1, cur - 1));
    renderCart(products);
    updateCartBadge();
  }));
  wrap.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", e => {
    const id = e.currentTarget.getAttribute("data-del");
    updateQty(id, 0);
    renderCart(products);
    updateCartBadge();
  }));
  wrap.querySelectorAll("[data-qty]").forEach(inp => inp.addEventListener("change", e => {
    const id = e.currentTarget.getAttribute("data-qty");
    const val = parseInt(e.currentTarget.value, 10);
    updateQty(id, Number.isFinite(val) ? val : 1);
    renderCart(products);
    updateCartBadge();
  }));
}

// ====== WHATSAPP CHECKOUT ======
function openWhatsAppOrder(products, customer) {
  const cart = getCart();
  const items = Object.entries(cart)
    .map(([id, qty]) => {
      const p = products.find(x => String(x.id) === String(id));
      return p ? { p, qty } : null;
    })
    .filter(Boolean);

  if (items.length === 0) {
    alert("Tu carrito está vacío.");
    return;
  }

  let total = 0;
  const lines = items.map(({ p, qty }) => {
    const sub = p.price * qty;
    total += sub;
    return `- ${p.name} (x${qty}) ${money(sub)}`;
  });

  const parts = [];
  parts.push("Hola, quiero hacer un pedido:");
  parts.push(lines.join("\n"));
  parts.push(`Total estimado: ${money(total)}`);

  if (customer?.name) parts.push(`Nombre: ${customer.name}`);
  if (customer?.zone) parts.push(`Zona: ${customer.zone}`);
  if (customer?.note) parts.push(`Nota: ${customer.note}`);

  parts.push("¿Me apoyas a coordinar la entrega y forma de pago?");

  const msg = encodeURIComponent(parts.join("\n"));
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// ====== HELPERS ======
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
