// Quadros carregados do armazenamento local (veja dados.js e cadastro.html).
// A tela de venda mostra apenas os quadros que ainda estão disponíveis;
// os que já foram vendidos continuam guardados no painel de cadastro.
const todosQuadros = carregarQuadros();
const quadros = todosQuadros.filter((q) => !q.vendido);

const CHAVE_CARRINHO = "patinhas_carrinho_v1";

function carregarCarrinho() {
  try {
    const salvo = localStorage.getItem(CHAVE_CARRINHO);
    if (!salvo) return [];

    const lista = JSON.parse(salvo);
    if (!Array.isArray(lista)) return [];

    return lista.filter((item) => item && typeof item === "object");
  } catch (e) {
    return [];
  }
}

function salvarCarrinho() {
  try {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
  } catch (e) {
    console.warn("Não foi possível salvar o carrinho no navegador.", e);
  }
}

const carrinho = carregarCarrinho();

const grid = document.getElementById("grid-quadros");
const listaCarrinho = document.getElementById("lista-carrinho");
const totalEl = document.getElementById("total");

function formatar(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Usa a foto cadastrada no painel; se não houver, tenta a foto da pasta "fotos".
function fotoDoQuadro(q) {
  return urlDaFoto(q);
}

const gridGaleria = document.getElementById("grid-galeria");

function renderizarGaleria() {
  todosQuadros.forEach((q) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="foto">
        <img src="${fotoDoQuadro(q)}" alt="${q.nome}" onerror="this.parentElement.innerHTML='🖼️ Foto em breve'">
      </div>
      <h3>${q.nome}</h3>
      <textarea rows="3" placeholder="Escreva o significado deste quadro..."></textarea>
    `;
    gridGaleria.appendChild(card);
  });
}

function renderizarQuadros() {
  if (quadros.length === 0) {
    grid.innerHTML =
      "<p>Todos os quadros foram vendidos! 🎉💖 Muito obrigada por ajudar o Instituto Aurora Animal.</p>";
    return;
  }

  quadros.forEach((q) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="foto">
        <img src="${fotoDoQuadro(q)}" alt="${q.nome}" onerror="this.parentElement.innerHTML='🖼️ Foto em breve'">
      </div>
      <div class="emoji">${q.emoji || "🎨"}</div>
      <h3>${q.nome}</h3>
      <p>${formatar(q.preco)}</p>
      <button class="btn" data-id="${q.id}">Adicionar 💖</button>
    `;
    grid.appendChild(card);
  });

  grid.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      const id = Number(e.target.dataset.id);
      const quadro = quadros.find((q) => q.id === id);
      if (!quadro) return;
      carrinho.push(quadro);
      salvarCarrinho();
      renderizarCarrinho();
    }
  });
}

function renderizarCarrinho() {
  listaCarrinho.innerHTML = "";
  carrinho.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `${item.emoji} ${item.nome} — ${formatar(item.preco)}
      <button onclick="remover(${index})" style="border:none;background:none;cursor:pointer;">❌</button>`;
    listaCarrinho.appendChild(li);
  });
  const total = carrinho.reduce((soma, item) => soma + item.preco, 0);
  totalEl.textContent = "Total: " + formatar(total);
}

function remover(index) {
  carrinho.splice(index, 1);
  salvarCarrinho();
  renderizarCarrinho();
}

document.getElementById("btn-finalizar").addEventListener("click", () => {
  if (carrinho.length === 0) {
    alert("Seu carrinho está vazio! 🛒");
  } else {
    const total = carrinho.reduce((soma, item) => soma + item.preco, 0);
    alert(
      `Obrigado pela compra! 💖\n\n${formatar(total)} será 100% doado ao Instituto Aurora Animal de Mossoró/RN.\n\nVocê ajuda a salvar vidas! 🐶🐱`
    );
    carrinho.length = 0;
    salvarCarrinho();
    renderizarCarrinho();
  }
});

renderizarCarrinho();
renderizarQuadros();
renderizarGaleria();
