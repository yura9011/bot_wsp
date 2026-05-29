const { generarRespuestaLLM } = require("../llm");

const ESTADOS = {
  INICIAL: "catalogo_inicial",
  ESPERANDO_NOMBRE: "catalogo_esperando_nombre",
  MENU: "catalogo_menu",
  BUSCAR: "catalogo_buscar",
  CATEGORIAS: "catalogo_categorias",
  VER_CATEGORIA: "catalogo_ver_categoria",
};

const MONTO_GRANDE = 15000;

function getSaludo(info) {
  return `Hola, bienvenido a *${info.nombre || "nuestra tienda"}* 🛒

📍 ${info.direccion || "Consultar dirección"}
📞 ${info.telefono || "Consultar teléfono"}

¿Cómo te llamás?`;
}

function getMenu() {
  return `¿Qué necesitás?

1️⃣ Buscar producto
2️⃣ Ver categorías
3️⃣ Contacto

0️⃣ Volver al menú

Elegí una opción.`;
}

function getContacto(info) {
  return `📞 *Contacto*

Nombre: ${info.nombre || "Nuestra tienda"}
Teléfono: ${info.telefono || "Consultar"}
Dirección: ${info.direccion || "Consultar"}

¿Necesitás algo más? Respondé *0* para volver al menú.`;
}

function formatearResultados(items) {
  if (!items || items.length === 0) return null;
  let texto = "🔍 *Resultados:*\n\n";
  for (const item of items) {
    const stockInfo = item.stock === 0
      ? "❌ *SIN STOCK*"
      : item.stock <= 3
        ? `⚠️ Últimas ${item.stock} unidades`
        : `✅ Stock: ${item.stock}`;
    texto += `• *${item.nombre}* — $${item.precio}\n  ${stockInfo}\n  ${item.descripcion}\n\n`;
  }
  return texto;
}

async function handleMessage(agent, message, userId, texto) {
  if (!agent.estadosUsuario[userId]) {
    agent.estadosUsuario[userId] = ESTADOS.INICIAL;
  }

  const estado = agent.estadosUsuario[userId];

  if (estado === ESTADOS.INICIAL) {
    await agent.responderBot(message, getSaludo(agent.config.info || {}));
    agent.estadosUsuario[userId] = ESTADOS.ESPERANDO_NOMBRE;
    return;
  }

  if (estado === ESTADOS.ESPERANDO_NOMBRE) {
    const nombre = texto.replace(/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s]/g, "").trim().split(/\s+/)[0] || "amigo";
    agent.datosUsuario[userId] = agent.datosUsuario[userId] || {};
    agent.datosUsuario[userId].nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    await agent.responderBot(message, `¡Hola ${agent.datosUsuario[userId].nombre}! 🛒\n\n¿Qué necesitás?`);
    await agent.responderBot(message, getMenu());
    agent.estadosUsuario[userId] = ESTADOS.MENU;
    return;
  }

  if (estado === ESTADOS.MENU) {
    if (texto === "0") {
      await agent.responderBot(message, getMenu());
      return;
    }
    if (texto === "1") {
      await agent.responderBot(message, "Decime qué estás buscando y te muestro lo que tenemos. 🔍");
      agent.estadosUsuario[userId] = ESTADOS.BUSCAR;
      return;
    }
    if (texto === "2") {
      if (agent.catalogo && agent.catalogo.getCategorias) {
        const cats = agent.catalogo.getCategorias();
        let msg = "📂 *Categorías:*\n\n";
        cats.forEach((c, i) => { msg += `${i + 1}️⃣ ${c.charAt(0).toUpperCase() + c.slice(1)}\n`; });
        msg += "\nElegí una categoría.";
        await agent.responderBot(message, msg);
        agent.estadosUsuario[userId] = ESTADOS.CATEGORIAS;
      } else {
        await agent.responderBot(message, "Las categorías no están disponibles.");
      }
      return;
    }
    if (texto === "3") {
      await agent.responderBot(message, getContacto(agent.config.info || {}));
      return;
    }
    await agent.responderBot(message, "No entendí. Elegí una opción:\n\n1️⃣ Buscar producto\n2️⃣ Ver categorías\n3️⃣ Contacto");
    return;
  }

  if (estado === ESTADOS.BUSCAR) {
    if (texto === "0") {
      agent.estadosUsuario[userId] = ESTADOS.MENU;
      await agent.responderBot(message, getMenu());
      return;
    }

    let resultados = [];
    if (agent.catalogo && agent.catalogo.buscarProductos) {
      try {
        resultados = agent.catalogo.buscarProductos(texto, 5);
        agent.statsManager.registrarBusqueda(texto, resultados.length).catch(() => {});
      } catch (e) { /* search failed */ }
    }

    if (resultados.length > 0) {
      const textoResultados = formatearResultados(resultados);
      if (textoResultados) await agent.responderBot(message, textoResultados);

      const total = resultados.reduce((sum, r) => sum + r.precio, 0);
      if (total > MONTO_GRANDE) {
        await agent.responderBot(message, `El total de esta consulta es $${total}. Para compras grandes, te recomiendo hablar con un operador que te asesore mejor.\n\nEscribí *hablar con persona* o seguí buscando con *1*.`);
      } else {
        await agent.responderBot(message, "Escribí *1* para buscar otro producto, o *0* para volver al menú.");
      }
    } else {
      await agent.responderBot(message, `No encontré productos para "*${texto}*".`);

      if (agent.catalogo && agent.catalogo.buscarProductos) {
        const intentos = texto.split(/\s+/);
        let alternativas = [];
        for (const palabra of intentos) {
          if (palabra.length > 3) {
            const encontrados = agent.catalogo.buscarProductos(palabra, 3);
            alternativas.push(...encontrados);
          }
        }
        const unicas = [...new Map(alternativas.map(a => [a.id, a])).values()].slice(0, 3);
        if (unicas.length > 0) {
          await agent.responderBot(message, "¿Buscabas algo de esto?\n\n" + formatearResultados(unicas));
        }
      }

      await agent.responderBot(message, "Intentá con otras palabras, o escribí *0* para volver al menú.");
    }
    return;
  }

  if (estado === ESTADOS.CATEGORIAS) {
    if (texto === "0") {
      agent.estadosUsuario[userId] = ESTADOS.MENU;
      await agent.responderBot(message, getMenu());
      return;
    }

    if (agent.catalogo && agent.catalogo.getCategorias && agent.catalogo.getProductosPorCategoria) {
      const cats = agent.catalogo.getCategorias();
      const idx = parseInt(texto) - 1;
      if (idx >= 0 && idx < cats.length) {
        const cat = cats[idx];
        const items = agent.catalogo.getProductosPorCategoria(cat);
        if (items.length > 0) {
          let msg = `📂 *${cat.charAt(0).toUpperCase() + cat.slice(1)}:*\n\n`;
          for (const item of items) {
            const stockInfo = item.stock === 0 ? "❌ SIN STOCK" : `(${item.stock} disp.)`;
            msg += `• ${item.nombre} — $${item.precio} ${stockInfo}\n`;
          }
          await agent.responderBot(message, msg);
        } else {
          await agent.responderBot(message, `No hay productos disponibles en *${cat}*.`);
        }
        await agent.responderBot(message, "Escribí un número de categoría para ver otra, o *0* para volver al menú.");
      } else {
        await agent.responderBot(message, "Categoría no válida. Elegí un número de la lista.");
      }
    }
    return;
  }

  await agent.responderBot(message, "Escribí *0* para volver al menú.");
}

module.exports = {
  name: "catalogo",
  ESTADOS,
  handleMessage,
  getSaludo,
  getMenu,
  getContacto,
  formatearResultados
};
