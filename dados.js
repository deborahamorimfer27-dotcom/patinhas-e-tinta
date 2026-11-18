// 🗄️ Armazenamento local dos quadros
// Funciona direto no navegador, sem servidor. A foto é guardada como imagem
// (já comprimida) e os demais dados em texto no localStorage.

const CHAVE_QUADROS = "patinhas_quadros_v1";
const SERVIDOR_IMAGENS = "http://127.0.0.1:3000";

// Quadros que já vêm cadastrados no site (podem ser editados ou excluídos).
const QUADROS_PADRAO = [
  { id: 1, nome: "Gatinho Dorminhoco", descricao: "A calma e o aconchego dos lares que acolhem.", preco: 80, emoji: "🐱", foto: "", vendido: false },
  { id: 2, nome: "Cachorrinho Feliz", descricao: "A alegria e a lealdade dos melhores amigos.", preco: 95, emoji: "🐶", foto: "", vendido: false },
  { id: 3, nome: "Coelhinho de Pelúcia", descricao: "Ternura e delicadeza em tons suaves.", preco: 70, emoji: "🐰", foto: "", vendido: false },
  { id: 4, nome: "Filhote Curioso", descricao: "A curiosidade que move os pequenos.", preco: 110, emoji: "🐾", foto: "", vendido: false },
  { id: 5, nome: "Pássaro Cantor", descricao: "Liberdade e a música da natureza.", preco: 85, emoji: "🐦", foto: "", vendido: false },
  { id: 6, nome: "Hamster Preguiçoso", descricao: "A arte de descansar com carinho.", preco: 65, emoji: "🐹", foto: "", vendido: false },
];

// Lê os quadros salvos. Se não houver nada salvo, devolve os quadros padrão.
function carregarQuadros() {
  try {
    const salvo = localStorage.getItem(CHAVE_QUADROS);
    if (!salvo) return QUADROS_PADRAO.map((q) => ({ ...q }));
    const lista = JSON.parse(salvo);
    if (!Array.isArray(lista)) return QUADROS_PADRAO.map((q) => ({ ...q }));
    return lista;
  } catch (e) {
    return QUADROS_PADRAO.map((q) => ({ ...q }));
  }
}

// Salva a lista inteira de quadros.
function salvarQuadros(lista) {
  localStorage.setItem(CHAVE_QUADROS, JSON.stringify(lista));
}

async function salvarImagem(dataUrl) {
  const resposta = await fetch(`${SERVIDOR_IMAGENS}/api/imagens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!resposta.ok) throw new Error("Não foi possível salvar a foto.");
  const resultado = await resposta.json();
  return resultado.foto;
}

async function excluirImagem(foto) {
  if (!foto || !foto.startsWith("imagens/")) return;
  const resposta = await fetch(`${SERVIDOR_IMAGENS}/api/imagens`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ foto }),
  });
  if (!resposta.ok) throw new Error("Não foi possível apagar a foto.");
}

function urlDaFoto(quadro) {
  if (quadro.foto && quadro.foto.startsWith("imagens/")) {
    return `${SERVIDOR_IMAGENS}/${quadro.foto}`;
  }
  return quadro.foto || `fotos/quadro${quadro.id}.jpg`;
}

// Gera o próximo id disponível.
function proximoId(lista) {
  return lista.reduce((maior, q) => Math.max(maior, Number(q.id) || 0), 0) + 1;
}
