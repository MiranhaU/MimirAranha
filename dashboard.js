// Imports iniciais
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  getDocs,
  where,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCfldHP45hJ5E2QjLEdAykMpU8xXhsE6c4",
    authDomain: "ficha-investigador.firebaseapp.com",
    projectId: "ficha-investigador",
    storageBucket: "ficha-investigador.firebasestorage.app",
    messagingSenderId: "95176340074",
    appId: "1:95176340074:web:1141312cfdc0217d525013",
    measurementId: "G-WPW58L9BRB"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore();


const DASHBOARD_SELECTION_KEY = "dashboard_selected_characters";
const PM_UNLOCK_KEY = "pm_unlocked_fichas";

function getSelectedCharacters() {
  try {
    return JSON.parse(localStorage.getItem(DASHBOARD_SELECTION_KEY)) || [];
  } catch {
    return [];
  }
}
function setSelectedCharacters(ids) {
  localStorage.setItem(DASHBOARD_SELECTION_KEY, JSON.stringify(ids));
}

// Helpers para localStorage do desbloqueio PM de cada ficha
function getUnlockedPMMap() {
  try {
    return JSON.parse(localStorage.getItem(PM_UNLOCK_KEY)) || {};
  } catch {
    return {};
  }
}
function setUnlockedPMMap(map) {
  localStorage.setItem(PM_UNLOCK_KEY, JSON.stringify(map));
}
function isFichaPMUnlocked(fichaId) {
  const map = getUnlockedPMMap();
  return !!map[fichaId];
}
function setFichaPMUnlocked(fichaId, unlocked) {
  const map = getUnlockedPMMap();
  map[fichaId] = unlocked ? true : false;
  setUnlockedPMMap(map);
}

// Estado global para fichas e rolagens
let allCharacters = [];
let allDiceRolls = {};
let unsubscribe = null;
let unsubscribeDiceRolls = null;

// Renderiza o dashboard com os personagens selecionados
function renderDashboard() {
  const dashboardContainer = document.getElementById("dashboard-container");
  if (!dashboardContainer) return;

  const selectedIds = getSelectedCharacters();
  const selectedFichas = allCharacters.filter(f => selectedIds.includes(f.id));

  dashboardContainer.innerHTML = `
    <div class="dashboard-cards">
      ${selectedFichas.length > 0 ? selectedFichas.map(fichaCardHTML).join("") : `
        <div class="empty-dashboard">
          <p>Nenhum personagem selecionado.</p>
        </div>
      `}
    </div>
    <button id="open-selection-btn" class="dashboard-btn" style="margin-top: 32px;">Selecionar Personagens</button>
  `;

  // Sempre reatribui o evento ao botão após renderização
  const openBtn = document.getElementById("open-selection-btn");
  if (openBtn) openBtn.onclick = () => openSelectionModal();
  
  // Botão para limpar rolagens
  const clearBtn = document.getElementById("clear-rolls-btn");
  if (clearBtn) clearBtn.onclick = () => clearAllDiceRolls();
  
  // Adiciona listeners para os botões de toggle PM em cada ficha
  selectedFichas.forEach(ficha => {
    const btnId = `toggle-mp-btn-${ficha.id}`;
    const toggleBtn = document.getElementById(btnId);
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        const currentlyUnlocked = isFichaPMUnlocked(ficha.id);
        setFichaPMUnlocked(ficha.id, !currentlyUnlocked);
        renderDashboard(); // Atualiza texto dos botões instantaneamente
        
        // Para avisar fichas já abertas a reagir sem reload
        window.localStorage.setItem('pm_toggle_event', JSON.stringify({ 
          changed: ficha.id, 
          unlocked: !currentlyUnlocked, 
          ts: Date.now() 
        }));
      };
    }
  });
  
  // Adiciona os listeners para os controles de MP
  addMPControlListeners();
}

// Limpar todas as rolagens no Firestore
async function clearAllDiceRolls() {
  try {
    const diceRollsSnapshot = await getDocs(collection(db, "diceRolls"));
    const deletePromises = [];
    
    diceRollsSnapshot.forEach(doc => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    console.log("Todas as rolagens foram limpas");
  } catch (error) {
    console.error("Erro ao limpar rolagens:", error);
  }
}

// Adiciona listeners para os controles de MP
function addMPControlListeners() {
  // Campos de input de MP
  document.querySelectorAll('.mp-input').forEach(input => {
    input.onchange = function() {
      const id = input.getAttribute('data-id');
      const ficha = allCharacters.find(f => f.id === id);
      const newValue = parseInt(input.value, 10) || 0;
      
      // Atualiza o valor no objeto local
      ficha.currentMP = newValue;
      
      // Salva no Firestore
      updateMPInFirestore(id, newValue);
      
      // Atualiza a visualização
      renderDashboard();
    };
  });
}

// Função para atualizar o MP no Firestore
async function updateMPInFirestore(characterId, mpValue) {
  try {
    const characterRef = doc(db, "fichas", characterId);
    await updateDoc(characterRef, {
      currentMP: mpValue
    });
    console.log(`MP atualizado para ${mpValue} no personagem ${characterId}`);
  } catch (error) {
    console.error("Erro ao atualizar MP:", error);
  }
}

// Gera HTML de um card de personagem com barras de progresso e rolagens recentes
function fichaCardHTML(ficha) {
  const characterRolls = allDiceRolls[ficha.id] || [];
  const lastThreeRolls = characterRolls.slice(0, 3); // Pegamos apenas as 3 últimas rolagens
  
  // Serialize ficha data for safe transfer
  const fichaData = { ...ficha };
  
  // Verifica se o PM está desbloqueado para esta ficha
  const unlocked = isFichaPMUnlocked(ficha.id);
  
  return `
    <div class="character-card" data-id="${ficha.id}">
      <div class="char-header">
        <span class="char-name">${ficha.charName || "(Sem nome)"}</span>
        <span class="char-occupation">${ficha.occupation || "-"}</span>
      </div>
      <div class="char-player">Jogador: <b>${ficha.playerName || "-"}</b></div>
      <div class="char-stats-row">
        <div><b>Mov:</b> ${ficha.movValue || "-"}</div>
        <div><b>Sorte:</b> ${ficha.luck || "-"}</div>
      </div>
      <div class="char-bars">
        ${progressBar("PV", ficha.currentHP, ficha.maxHP, "#e74c3c")}
        ${progressBar("SAN", ficha.currentSAN, 99 || ficha.maxHP, "#8b1e2d")}
        ${mpProgressBar(ficha)}
      </div>
      <div class="character-card-actions">
        <button class="dashboard-btn dashboard-btn-accent view-ficha-btn" onclick='openTemporaryFicha("${ficha.id}", ${JSON.stringify(
          fichaData
        ).replace(/'/g, "\\'")})'>
          Ver Ficha
        </button>
        <button id="toggle-mp-btn-${ficha.id}" class="dashboard-btn" style="margin-top: 8px;">
          ${unlocked ? "Bloquear PM" : "Desbloquear PM"}
        </button>
      </div>
    </div>
  `;
}

// HTML para uma rolagem individual
function diceRollHTML(roll) {
  // Seleciona a classe correta baseada no resultado
  let resultClass = 'roll-neutral';
  if (roll.result.includes('Sucesso')) {
    if (roll.result.includes('Ótimo')) {
      resultClass = 'roll-critical-success';
    } else if (roll.result.includes('Bom')) {
      resultClass = 'roll-good-success';
    } else {
      resultClass = 'roll-success';
    }
  } else if (roll.result.includes('Desastre')) {
    resultClass = 'roll-disaster';
  } else {
    resultClass = 'roll-failure';
  }
  
  // Formata data/hora de forma mais legível
  const timestamp = roll.timestamp ? new Date(roll.timestamp.seconds * 1000) : new Date();
  const timeString = timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  return `
    <div class="dice-roll ${resultClass}">
      <div class="roll-skill">${roll.skillName}</div>
      <div class="roll-details">
        <span class="roll-number">(${roll.rollValue})</span>
        <span class="roll-result">${roll.result}</span>
      </div>
      <div class="roll-time">${timeString}</div>
    </div>
  `;
}

// Função específica para a barra de progresso de MP com controles de edição
function mpProgressBar(ficha) {
  const current = Number(ficha.currentMP) || 0;
  const max = Number(ficha.maxMP) || 0;
  const percent = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  
  return `
    <div class="progress-bar-group mp-control-group">
      <div class="progress-bar-label">
        <b>PM:</b>
        <span class="mp-control">
          <input 
            type="number" 
            min="0" 
            max="${max}" 
            value="${current}" 
            class="mp-input" 
            data-id="${ficha.id}"
          /> / ${max}
        </span>
      </div>
      <div class="progress-bar-outer">
        <div class="progress-bar-inner" style="width: ${percent}%; background: #b71c1c;"></div>
      </div>
    </div>
  `;
}

// Função para criar barra de progresso estilizada
function progressBar(label, current, max, color) {
  current = Number(current) || 0;
  max = Number(max) || 0;
  const percent = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return `
    <div class="progress-bar-group">
      <div class="progress-bar-label">
        <b>${label}:</b> <span>${current} / ${max}</span>
      </div>
      <div class="progress-bar-outer">
        <div class="progress-bar-inner" style="width: ${percent}%; background: ${color};"></div>
      </div>
    </div>
  `;
}

// Modal de seleção de personagens (garante unicidade e atualização)
function openSelectionModal() {
  let modal = document.getElementById("character-selection-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "character-selection-modal";
    modal.className = "modal-overlay";
    document.body.appendChild(modal);
  }
  // Atualiza o conteúdo do modal sempre que abrir
  const selectedIds = getSelectedCharacters();
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Selecionar Personagens</h2>
      <form id="character-selection-form" class="modal-form">
        ${allCharacters.map(character => `
          <label class="character-checkbox">
            <input type="checkbox" name="character" value="${character.id}" ${selectedIds.includes(character.id) ? "checked" : ""}>
            <span><b>${character.charName || "(Sem nome)"}</b> — ${character.occupation || "-"} (${character.playerName || "-"})</span>
          </label>
        `).join("")}
      </form>
      <div class="modal-actions">
        <button id="close-selection-btn" type="button" class="dashboard-btn">Cancelar</button>
        <button id="save-selection-btn" type="button" class="dashboard-btn dashboard-btn-accent">Salvar</button>
      </div>
    </div>
  `;
  // Fecha ao clicar fora do conteúdo
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  // Fecha ao clicar em cancelar
  document.getElementById("close-selection-btn").onclick = () => modal.remove();
  // Salva seleção ao clicar em salvar
  document.getElementById("save-selection-btn").onclick = () => {
    const checked = Array.from(document.querySelectorAll('#character-selection-form input[type="checkbox"]:checked')).map(cb => cb.value);
    setSelectedCharacters(checked);
    modal.remove();
    renderDashboard();
  };
  // Garante que o modal seja exibido (caso já exista, move para o topo)
  modal.style.display = "flex";
  document.body.appendChild(modal);
}

// Inicialização e atualização automática com onSnapshot para fichas e rolagens
function initDashboardRealtime() {
  // Fichas de personagens (já existente)
  if (unsubscribe) unsubscribe();
  unsubscribe = onSnapshot(collection(db, "fichas"), (snapshot) => {
    allCharacters = [];
    snapshot.forEach(doc => {
      allCharacters.push({ id: doc.id, ...doc.data() });
    });
    renderDashboard();
  });
  
  // Rolagens de dados (nova funcionalidade)
  if (unsubscribeDiceRolls) unsubscribeDiceRolls();
  unsubscribeDiceRolls = onSnapshot(
    query(collection(db, "diceRolls"), orderBy("timestamp", "desc")), 
    (snapshot) => {
      // Organizamos as rolagens por personagem
      allDiceRolls = {};
      
      snapshot.forEach(doc => {
        const rollData = doc.data();
        if (rollData.characterId) {
          if (!allDiceRolls[rollData.characterId]) {
            allDiceRolls[rollData.characterId] = [];
          }
          allDiceRolls[rollData.characterId].push({
            id: doc.id,
            ...rollData
          });
        }
      });
      
      renderDashboard();
    }
  );
}

// Estilos dinâmicos para dark mode e barras de progresso
function injectDashboardStyles() {
  if (document.getElementById("dashboard-dark-styles")) return;
  const style = document.createElement("style");
  style.id = "dashboard-dark-styles";
  style.innerHTML = `
    body {
      background: #181316;
      color: #f3eaea;
      font-family: 'Lora', serif;
    }
    .dashboard-header {
      background: #23171b;
      color: #8b1e2d;
      padding: 24px 0 16px 0;
      text-align: center;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(139, 30, 45, 0.10);
      border-bottom: 2px solid #8b1e2d;
    }
    .dashboard-cards {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: flex-start;
    }
    .character-card {
      background: #25181c;
      border: 1.5px solid #3a232a;
      border-radius: 12px;
      padding: 20px 22px;
      width: 340px;
      color: #f3eaea;
      box-shadow: 0 4px 16px rgba(139, 30, 45, 0.10);
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: box-shadow 0.2s, border 0.2s;
    }
    .character-card:hover {
      box-shadow: 0 6px 24px rgba(139, 30, 45, 0.22);
      border: 1.5px solid #8b1e2d;
    }
    .char-header {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 2px;
    }
    .char-name {
      font-size: 1.22em;
      font-weight: bold;
      color: #e74c3c;
      letter-spacing: 0.5px;
    }
    .char-occupation {
      color: #bfa6a6;
      font-size: 1em;
      font-style: italic;
    }
    .char-player {
      color: #bfa6a6;
      margin-bottom: 4px;
    }
    .char-stats-row {
      display: flex;
      gap: 18px;
      margin-top: 6px;
      margin-bottom: 4px;
      color: #f3eaea;
    }
    .char-bars {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }
    .progress-bar-group {
      width: 100%;
    }
    .progress-bar-label {
      font-size: 0.98em;
      margin-bottom: 2px;
      color: #bfa6a6;
      display: flex;
      justify-content: space-between;
    }
    .mp-control {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .mp-input {
      background: #23171b;
      color: #f3eaea;
      border: 1px solid #3a232a;
      border-radius: 4px;
      width: 40px;
      padding: 2px 4px;
      text-align: center;
    }
    .progress-bar-label b {
      color: #e74c3c;
      font-weight: 600;
    }
    .progress-bar-outer {
      width: 100%;
      height: 14px;
      background: #23171b;
      border-radius: 7px;
      overflow: hidden;
      border: 1px solid #3a232a;
      box-shadow: 0 1px 4px #1a0a0e33 inset;
    }
    .progress-bar-inner {
      height: 100%;
      border-radius: 7px 0 0 7px;
      transition: width 0.3s;
    }
    /* Estilos para rolagens de dados */
    .dice-rolls-container {
      margin-top: 8px;
      border-top: 1px solid #3a232a;
      padding-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 120px;
      overflow-y: auto;
    }
    .dice-roll {
      display: flex;
      flex-direction: column;
      font-size: 0.9em;
      padding: 4px 8px;
      border-radius: 6px;
      border-left: 3px solid #3a232a;
      background: #1e1518;
    }
    .roll-skill {
      font-weight: bold;
      font-size: 0.85em;
      color: #bfa6a6;
    }
    .roll-details {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .roll-number {
      font-family: monospace;
      font-size: 0.95em;
    }
    .roll-result {
      font-weight: 600;
    }
    .roll-time {
      font-size: 0.75em;
      color: #8a7a7a;
      align-self: flex-end;
    }
    .roll-critical-success {
      border-left-color: #4caf50;
      background: #1e2419;
    }
    .roll-critical-success .roll-result {
      color: #4caf50;
    }
    .roll-good-success {
      border-left-color: #8bc34a;
      background: #1f241a;
    }
    .roll-good-success .roll-result {
      color: #8bc34a;
    }
    .roll-success {
      border-left-color: #cddc39;
      background: #24241b;
    }
    .roll-success .roll-result {
      color: #cddc39;
    }
    .roll-failure {
      border-left-color: #ff9800;
      background: #24201b;
    }
    .roll-failure .roll-result {
      color: #ff9800;
    }
    .roll-disaster {
      border-left-color: #f44336;
      background: #241b1b;
    }
    .roll-disaster .roll-result {
      color: #f44336;
    }
    .no-rolls {
      text-align: center;
      font-style: italic;
      color: #8a7a7a;
      padding: 10px 0;
    }
    .dashboard-btn {
      background: #23171b;
      color: #f3eaea;
      border: 1px solid #8b1e2d;
      border-radius: 6px;
      padding: 8px 22px;
      font-size: 1em;
      cursor: pointer;
      margin-top: 8px;
      margin-bottom: 8px;
      transition: background 0.2s, color 0.2s, border 0.2s;
    }
    .dashboard-btn-accent {
      background: #8b1e2d;
      color: #fff;
      border: 1px solid #e74c3c;
    }
    .dashboard-btn:hover, .dashboard-btn-accent:hover {
      background: #e74c3c;
      color: #fff;
      border: 1px solid #fff;
    }
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(24, 19, 22, 0.92);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .modal-content {
      background: #23171b;
      color: #f3eaea;
      border: 2px solid #8b1e2d;
      border-radius: 14px;
      padding: 32px 28px;
      min-width: 340px;
      max-width: 95vw;
      box-shadow: 0 8px 32px #8b1e2d33;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .modal-content h2 {
      color: #e74c3c;
      margin-bottom: 10px;
    }
    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 50vh;
      overflow-y: auto;
    }
    .character-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #bfa6a6;
      font-size: 1em;
    }
    .character-checkbox input[type="checkbox"]:checked + span {
      color: #e74c3c;
      font-weight: bold;
    }
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 10px;
    }
    .empty-dashboard {
      text-align: center;
      color: #bfa6a6;
      margin-top: 40px;
    }
    .character-card-actions {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-top: 12px;
    }
    .view-ficha-btn {
      align-self: center;
      width: 100%;
    }
    @media (max-width: 700px) {
      .dashboard-cards {
        flex-direction: column !important;
        align-items: center;
      }
      .character-card {
        width: 95vw !important;
        min-width: 0 !important;
      }
      .modal-content {
        min-width: 0;
        width: 95vw;
        padding: 18px 6vw;
      }
    }
  `;
  document.head.appendChild(style);
}

// Inicialização automática
window.addEventListener("DOMContentLoaded", () => {
  injectDashboardStyles();
  initDashboardRealtime();
});

// Função para abrir ficha temporária com dados completos
window.openTemporaryFicha = function(id, fichaData) {
  // Armazena os dados no localStorage com uma chave única
  localStorage.setItem(`temp_ficha_${id}`, JSON.stringify(fichaData));
  // Abre a página da ficha em modo temporário
  window.open(`index.html?tempFichaId=${id}`, "_blank");
};

// Exporta funções caso precise importar em outro lugar
export { renderDashboard, openSelectionModal };
