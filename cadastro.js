// 🎨 Painel de cadastro dos quadros

let lista = carregarQuadros();
let fotoAtual = ""; // foto escolhida (data URL) — só é gravada ao salvar
let processamentoFoto = null;
let editandoId = null; // null = cadastrando novo

const form = document.getElementById("form-quadro");
const grid = document.getElementById("grid-cadastro");
const preview = document.getElementById("preview-foto");
const campoFoto = document.getElementById("campo-foto");
const btnCancelar = document.getElementById("btn-cancelar");
const tituloForm = document.getElementById("titulo-form");

const campoNome = document.getElementById("campo-nome");
const campoDescricao = document.getElementById("campo-descricao");
const campoPreco = document.getElementById("campo-preco");
const campoEmoji = document.getElementById("campo-emoji");

function formatar(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Comprime a imagem escolhida para caber no armazenamento do navegador.
function comprimirImagem(file, maxLado = 700, qualidade = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("O arquivo selecionado não é uma imagem."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxLado) {
          height = Math.round((height * maxLado) / width);
          width = maxLado;
        } else if (height >= width && height > maxLado) {
          width = Math.round((width * maxLado) / height);
          height = maxLado;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const contexto = canvas.getContext("2d");
        if (!contexto) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }
        try {
          contexto.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", qualidade));
        } catch (erro) {
          reject(erro);
        }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

campoFoto.addEventListener("change", async () => {
  const arquivo = campoFoto.files && campoFoto.files[0];
  if (!arquivo) return;
  preview.textContent = "⏳ Processando a foto...";
  fotoAtual = "";
  const tarefa = comprimirImagem(arquivo).then((foto) => {
    if (campoFoto.files[0] !== arquivo) return;
    fotoAtual = foto;
    preview.innerHTML = `<img src="${fotoAtual}" alt="Prévia da foto" />`;
  }).catch(() => {
    if (campoFoto.files[0] !== arquivo) return;
    fotoAtual = "";
    preview.textContent = "😢 Não foi possível ler essa imagem. Tente outra.";
  });
  processamentoFoto = tarefa;
  try {
    await tarefa;
  } finally {
    if (processamentoFoto === tarefa) processamentoFoto = null;
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (processamentoFoto) await processamentoFoto;
  if (campoFoto.files.length && !fotoAtual) {
    alert("Não foi possível adicionar essa foto. Escolha outra imagem e tente novamente.");
    return;
  }

  const nome = campoNome.value.trim();
  const descricao = campoDescricao.value.trim();
  const preco = Number(campoPreco.value) || 0;
  const emoji = campoEmoji.value.trim() || "🎨";
  if (!nome) return;

  let fotoSalva = "";
  if (fotoAtual) {
    try {
      fotoSalva = await salvarImagem(fotoAtual);
    } catch (erro) {
      alert("Não foi possível salvar a foto. Inicie o servidor local com node server.js e tente novamente.");
      return;
    }
  }

  const novaLista = lista.map((quadro) => ({ ...quadro }));
  let fotoAnterior = "";
  if (editandoId !== null) {
    const q = novaLista.find((x) => x.id === editandoId);
    q.nome = nome;
    q.descricao = descricao;
    q.preco = preco;
    q.emoji = emoji;
    if (fotoSalva) {
      fotoAnterior = q.foto;
      q.foto = fotoSalva;
    }
  } else {
    novaLista.push({
      id: proximoId(novaLista),
      nome,
      descricao,
      preco,
      emoji,
      foto: fotoSalva,
      vendido: false,
    });
  }

  try {
    salvarQuadros(novaLista);
  } catch (err) {
    if (fotoSalva) await excluirImagem(fotoSalva).catch(() => {});
    alert("Não foi possível salvar os dados do quadro no navegador.");
    return;
  }

  lista = novaLista;
  if (fotoSalva && fotoAnterior) {
    await excluirImagem(fotoAnterior).catch(() => {
      alert("O quadro foi salvo, mas não foi possível apagar a foto antiga da pasta imagens/.");
    });
  }

  const eraEdicao = editandoId !== null;
  resetForm();
  renderizarLista();
  alert(eraEdicao ? "Quadro atualizado! 💖" : "Quadro cadastrado com sucesso! 💖");
});

function resetForm() {
  form.reset();
  editandoId = null;
  fotoAtual = "";
  preview.textContent = "🖼️ Nenhuma foto selecionada";
  tituloForm.textContent = "Cadastrar novo quadro 💖";
  document.getElementById("btn-salvar").textContent = "Salvar quadro 💖";
  btnCancelar.hidden = true;
}

btnCancelar.addEventListener("click", resetForm);

function editar(id) {
  const q = lista.find((x) => x.id === id);
  if (!q) return;
  editandoId = id;
  campoNome.value = q.nome;
  campoDescricao.value = q.descricao || "";
  campoPreco.value = q.preco;
  campoEmoji.value = q.emoji || "";
  fotoAtual = "";
  preview.innerHTML = q.foto
    ? `<img src="${urlDaFoto(q)}" alt="${q.nome}" />`
    : "🖼️ Nenhuma foto selecionada";
  tituloForm.textContent = `Editando: ${q.nome} ✏️`;
  document.getElementById("btn-salvar").textContent = "Salvar alterações 💖";
  btnCancelar.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function alternarVendido(id) {
  const q = lista.find((x) => x.id === id);
  if (!q) return;
  q.vendido = !q.vendido;
  try {
    salvarQuadros(lista);
  } catch (err) {
    alert("Não foi possível salvar 😢");
    lista = carregarQuadros();
  }
  renderizarLista();
}

async function excluir(id) {
  if (!confirm("Tem certeza que deseja excluir este quadro? Isso não pode ser desfeito.")) return;
  const quadro = lista.find((x) => x.id === id);
  lista = lista.filter((x) => x.id !== id);
  try {
    salvarQuadros(lista);
  } catch (erro) {
    alert("Não foi possível excluir o quadro.");
    lista = carregarQuadros();
    renderizarLista();
    return;
  }
  if (quadro && quadro.foto && quadro.foto.startsWith("imagens/")) {
    await excluirImagem(quadro.foto).catch(() => {
      alert("O quadro foi excluído, mas não foi possível apagar a foto da pasta imagens/.");
    });
  }
  if (editandoId === id) resetForm();
  renderizarLista();
}

function renderizarLista() {
  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = "<p>Nenhum quadro cadastrado ainda. Cadastre o primeiro acima! 🎨</p>";
    return;
  }

  lista.forEach((q) => {
    const card = document.createElement("div");
    card.className = "card";
    const foto = urlDaFoto(q);
    card.innerHTML = `
      <div class="foto">
        <img src="${foto}" alt="${q.nome}" onerror="this.parentElement.innerHTML='🖼️ Foto em breve'">
      </div>
      <div class="emoji">${q.emoji || "🎨"}</div>
      <h3>${q.nome}</h3>
      <p>${formatar(q.preco)}</p>
      <span class="badge ${q.vendido ? "badge-vendido" : "badge-disponivel"}">
        ${q.vendido ? "💜 Vendido" : "💚 Disponível na loja"}
      </span>
      <div class="acoes">
        <button class="btn" data-acao="editar" data-id="${q.id}">✏️ Editar</button>
        <button class="btn btn-secundario" data-acao="vender" data-id="${q.id}">
          ${q.vendido ? "↩️ Marcar disponível" : "💰 Marcar vendido"}
        </button>
        <button class="btn btn-excluir" data-acao="excluir" data-id="${q.id}">🗑️ Excluir</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

grid.addEventListener("click", (e) => {
  const botao = e.target.closest("button[data-acao]");
  if (!botao) return;
  const id = Number(botao.dataset.id);
  const acao = botao.dataset.acao;
  if (acao === "editar") editar(id);
  else if (acao === "vender") alternarVendido(id);
  else if (acao === "excluir") excluir(id);
});

renderizarLista();
