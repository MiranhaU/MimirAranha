import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCfldHP45hJ5E2QjLEdAykMpU8xXhsE6c4", // IMPORTANT: Consider moving API keys to environment variables or a secure backend.
    authDomain: "ficha-investigador.firebaseapp.com",
    projectId: "ficha-investigador",
    storageBucket: "ficha-investigador.firebasestorage.app",
    messagingSenderId: "95176340074",
    appId: "1:95176340074:web:1141312cfdc0217d525013",
    measurementId: "G-WPW58L9BRB"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Função de Logout
async function handleLogout() {
  try {
    await signOut(auth);
    console.log("Usuário desconectado com sucesso.");
    window.location.href = "login.html"; 
  } catch (error) {
    console.error("Erro ao desconectar:", error);
  }
}


// Função para configurar todos os event listeners necessários para salvar a ficha
function setupSaveListeners(uid) {
  // Debouncing function to prevent excessive saves
  let saveTimeout = null;
  function debouncedSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      salvarFicha(uid);
      saveTimeout = null;
    }, 1000); // Delay de 1 segundo
  }

  // Adiciona listeners para todos os campos de entrada básicos
  document.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('change', debouncedSave);
    el.addEventListener('blur', debouncedSave);
  });
  
  // Adiciona listeners para campos editáveis
  document.querySelectorAll('.editable-value').forEach(el => {
    el.addEventListener('blur', debouncedSave);
  });

  // Adiciona listeners específicos para perícias
  document.querySelectorAll('.skill-regular').forEach(el => {
    el.addEventListener('change', debouncedSave);
    el.addEventListener('blur', debouncedSave);
  });

  // Adiciona listeners para botões de status
  document.querySelectorAll('.arrow-button').forEach(button => {
    button.addEventListener('click', debouncedSave);
  });

  // Adiciona listener para o botão de adicionar armas e itens
  const addWeaponButton = document.getElementById('add-weapon');
  if (addWeaponButton) {
    addWeaponButton.addEventListener('click', () => {
      setTimeout(debouncedSave, 100);
    });
  }

  const addItemButton = document.getElementById('add-item');
  if (addItemButton) {
    addItemButton.addEventListener('click', () => {
      setTimeout(debouncedSave, 100);
    });
  }

  // Adiciona listener para mudanças em características que afetam perícias dinâmicas
  ['str', 'con', 'siz', 'dex', 'app', 'int', 'pow', 'edu'].forEach(attr => {
    const el = document.getElementById(attr);
    if (el) {
      el.addEventListener('change', () => {
        if (typeof updateDynamicSkills === 'function') {
          updateDynamicSkills();
        }
        debouncedSave();
      });
      el.addEventListener('input', () => {
        if (typeof updateDynamicSkills === 'function') {
          updateDynamicSkills();
        }
        debouncedSave();
      });
    }
  });

  // Configurar delegação de eventos para containers que podem ter elementos adicionados dinamicamente
  const weaponGrid = document.querySelector('.weapon-grid');
  if (weaponGrid) {
    weaponGrid.addEventListener('change', (event) => {
      if (event.target.tagName === 'INPUT') {
        debouncedSave();
      }
    });
    weaponGrid.addEventListener('blur', (event) => {
      if (event.target.tagName === 'INPUT') {
        debouncedSave();
      }
    }, true);
  }

  const itemList = document.querySelector('.item-list');
  if (itemList) {
    itemList.addEventListener('change', (event) => {
      if (event.target.tagName === 'INPUT') {
        debouncedSave();
      }
    });
    itemList.addEventListener('blur', (event) => {
      if (event.target.tagName === 'INPUT') {
        debouncedSave();
      }
    }, true);
  }

  const skillsList = document.querySelector('.skills-list');
  if (skillsList) {
    skillsList.addEventListener('change', (event) => {
      if (event.target.tagName === 'INPUT') {
        debouncedSave();
      }
    });
    skillsList.addEventListener('blur', (event) => {
      if (event.target.tagName === 'INPUT') {
        debouncedSave();
      }
    }, true);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const uid = user.uid;
    const fichaRef = doc(db, "fichas", uid);

    const fichaSnap = await getDoc(fichaRef);
    if (fichaSnap.exists()) {
      preencherFicha(fichaSnap.data());
    } else {
      console.log("Nenhuma ficha encontrada para este usuário. Será criada ao salvar.");
      // Initialize with default empty structure for preencherFicha to work smoothly if creating new
      preencherFicha({}); 
    }

    onSnapshot(fichaRef, (docSnap) => {
      if (docSnap.exists()) {
        preencherFicha(docSnap.data());
      }
    });

    // Configurar todos os listeners de salvamento
    setupSaveListeners(uid);

    // Adicionar botão de salvamento manual
    createSaveButton();

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
      logoutButton.addEventListener('click', handleLogout);
    }
  }
});

function salvarFicha(uid) {
  console.log("Salvando ficha...");
  
  // Função auxiliar para pegar valores com fallback para campos que podem não existir
  const getElementValue = (id, defaultValue = '') => {
    const el = document.getElementById(id);
    if (!el) return defaultValue;
    
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      return el.value || defaultValue;
    } else {
      return el.textContent || defaultValue;
    }
  };

  const data = {
    // Informações do Investigador - Correção: IDs corretos
    charName: document.getElementById('charName')?.value || '',
    playerName: document.getElementById('playerName')?.value || '',
    occupation: document.getElementById('occupation')?.value || '',
    age: document.getElementById('age')?.value || '',
    sex: document.getElementById('sex')?.value || '',
    birthplace: document.getElementById('birthplace')?.value || '',

    // Características (Attributes)
    str: getElementValue('str', '50'),
    con: getElementValue('con', '50'),
    siz: getElementValue('siz', '50'),
    dex: getElementValue('dex', '50'),
    app: getElementValue('app', '50'),
    int: getElementValue('int', '50'),
    pow: getElementValue('pow', '50'),
    edu: getElementValue('edu', '50'),
    luck: getElementValue('luck', '50'),

    // Status (Current Values)
    currentHP: getElementValue('currentHP', '0'),
    maxHP: getElementValue('maxHP', '0'),
    currentSAN: getElementValue('currentSAN', '0'),
    currentMP: getElementValue('currentMP', '0'),
    maxMP: getElementValue('maxMP', '0'),
    
    // Atributos Derivados
    movValue: getElementValue('movValue', '8'),
    dbValue: getElementValue('dbValue', 'Nenhum'),
    buildValue: getElementValue('buildValue', '0'),

    // Histórico (Background)
    personalDescription: getElementValue('personalDescription', ''),
    ideologyBeliefs: getElementValue('ideologyBeliefs', ''),
    significantPeople: getElementValue('significantPeople', ''),
    significantLocations: getElementValue('significantLocations', ''),
    traits: getElementValue('traits', ''),

    // Equipamentos (Gear)
    cash: getElementValue('cash', ''),
    spendingLevel: getElementValue('spendingLevel', ''),
    gearNotes: getElementValue('gear', ''), // Ou poderia ser 'gearNotes'

    // Combate - Armas
    weapons: [],

    // Equipamentos - Itens Pessoais
    items: [],

    // Perícias (Skills)
    skills: []
  };

  // --- Coletar Armas ---
  const weaponGrid = document.querySelector('.weapon-grid');
  if (weaponGrid) {
    const weaponRows = Array.from(weaponGrid.querySelectorAll('input'));
    for (let i = 0; i < weaponRows.length; i += 4) {
      if (i + 3 < weaponRows.length) {
        const name = weaponRows[i].value.trim();
        // Só salva se o nome da arma não estiver vazio
        if (name !== '' && name !== "Nova arma...") {
          data.weapons.push({
            name: name,
            skillPercent: weaponRows[i+1].value,
            damage: weaponRows[i+2].value,
            range: weaponRows[i+3].value
          });
        }
      }
    }
  }

  // --- Coletar Itens Pessoais ---
  const itemRows = document.querySelectorAll('.item-list .item-row');
  itemRows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs.length >= 3 && inputs[0].value.trim() !== '') {
      data.items.push({
        name: inputs[0].value.trim(),
        quantity: inputs[1].value.trim(),
        weight: inputs[2].value.trim()
      });
    }
  });

  // --- CORREÇÃO: Coletar Perícias ---
  const skillItems = document.querySelectorAll('.skill-item');
  
  skillItems.forEach(skillItem => {
    // Extrai o nome da perícia
    const skillName = skillItem.querySelector('.skill-name')?.textContent.trim();
    if (!skillName) return;
    
    // Verifica se há detalhes expandidos para essa perícia
    const skillDetails = skillItem.nextElementSibling;
    let skillValue = '';
    
    // Se há detalhes expandidos e visíveis, use o valor do input
    if (skillDetails && 
        skillDetails.classList.contains('skill-details') && 
        !skillDetails.classList.contains('hidden')) {
      const regularInput = skillDetails.querySelector('.skill-regular');
      if (regularInput) {
        skillValue = regularInput.value;
      }
    } else {
      // Caso contrário, use o valor visível do elemento .skill-value
      const valueDisplay = skillItem.querySelector('.skill-value');
      if (valueDisplay) {
        skillValue = valueDisplay.textContent.replace('%', '').trim();
      }
    }
    
    // Converte para número inteiro para calcular half e quarter
    const valueInt = parseInt(skillValue) || 0;
    
    data.skills.push({
      name: skillName,
      value: String(valueInt),
      half: String(Math.floor(valueInt / 2)),
      quarter: String(Math.floor(valueInt / 4))
    });
  });

  console.log("Dados a serem salvos:", data);

  const fichaRef = doc(db, "fichas", uid);
  updateDoc(fichaRef, data).catch((error) => {
    console.log("Falha ao atualizar, tentando criar:", error);
    setDoc(fichaRef, data)
      .then(() => console.log("Ficha criada e salva com sucesso!"))
      .catch(err => console.error("Erro ao criar ficha:", err));
  });
}

// Correção da função preencherFicha
function preencherFicha(data) {
  console.log("Preenchendo ficha com dados:", data);

  // Função auxiliar para definir valores em elementos
  const setElementValue = (id, value, defaultValue = '') => {
    const el = document.getElementById(id);
    if (!el) return;
    
    const val = value !== undefined && value !== null ? value : defaultValue;
    
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      el.value = val;
    } else {
      el.textContent = val;
    }
  };

  // Informações do Investigador
  if (data.charName) document.getElementById('charName').value = data.charName;
  if (data.playerName) document.getElementById('playerName').value = data.playerName;
  if (data.occupation) document.getElementById('occupation').value = data.occupation;
  if (data.age) document.getElementById('age').value = data.age;
  if (data.sex) document.getElementById('sex').value = data.sex;
  if (data.birthplace) document.getElementById('birthplace').value = data.birthplace;

  // Características
  setElementValue('str', data.str, '50');
  setElementValue('con', data.con, '50');
  setElementValue('siz', data.siz, '50');
  setElementValue('dex', data.dex, '50');
  setElementValue('app', data.app, '50');
  setElementValue('int', data.int, '50');
  setElementValue('pow', data.pow, '50');
  setElementValue('edu', data.edu, '50');
  setElementValue('luck', data.luck, '50');

  // Status
  setElementValue('currentHP', data.currentHP, '0');
  setElementValue('maxHP', data.maxHP, '0');
  setElementValue('currentSAN', data.currentSAN, '0');
  setElementValue('currentMP', data.currentMP, '0');
  setElementValue('maxMP', data.maxMP, '0');
  
  // Atributos Derivados
  setElementValue('movValue', data.movValue, '8');
  setElementValue('dbValue', data.dbValue, 'Nenhum');
  setElementValue('buildValue', data.buildValue, '0');
  
  // Histórico
  setElementValue('personalDescription', data.personalDescription, '');
  setElementValue('ideologyBeliefs', data.ideologyBeliefs, '');
  setElementValue('significantPeople', data.significantPeople, '');
  setElementValue('significantLocations', data.significantLocations, '');
  setElementValue('traits', data.traits, '');

  // Equipamentos
  setElementValue('cash', data.cash, '');
  setElementValue('spendingLevel', data.spendingLevel, '');
  setElementValue('gear', data.gearNotes, '');
  
  // Atualiza barras de status se disponível
  if (typeof updateStatusBarsFromText === 'function') {
    updateStatusBarsFromText();
  }

  // --- Preencher Armas ---
  const weaponGrid = document.querySelector('.weapon-grid');
  if (weaponGrid) {
    // Limpa as armas existentes mantendo possíveis cabeçalhos
    const existingInputs = weaponGrid.querySelectorAll('input');
    existingInputs.forEach(input => input.remove());

    // Define armas padrão caso não haja dados
    const weaponsToDisplay = data.weapons && data.weapons.length > 0 ? data.weapons : [
      { name: "Soco/Chute", skillPercent: "25", damage: "1d3 + DB", range: "Toque" },
      { name: "", skillPercent: "", damage: "", range: "" } // Linha vazia para adicionar
    ];
    
    weaponsToDisplay.forEach(weapon => {
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = weapon.name || '';
      if (!weapon.name) nameInput.placeholder = "Nova arma...";
      
      const skillInput = document.createElement('input');
      skillInput.type = 'number';
      skillInput.value = weapon.skillPercent || '';
      if (!weapon.skillPercent) skillInput.placeholder = "%";
      
      const damageInput = document.createElement('input');
      damageInput.type = 'text';
      damageInput.value = weapon.damage || '';
      if (!weapon.damage) damageInput.placeholder = "Dano";
      
      const rangeInput = document.createElement('input');
      rangeInput.type = 'text';
      rangeInput.value = weapon.range || '';
      if (!weapon.range) rangeInput.placeholder = "Alcance";
      
      weaponGrid.appendChild(nameInput);
      weaponGrid.appendChild(skillInput);
      weaponGrid.appendChild(damageInput);
      weaponGrid.appendChild(rangeInput);
    });
    
    // Adiciona uma linha vazia no final para nova arma se necessário
    if (data.weapons && data.weapons.length > 0) {
      const emptyNameInput = document.createElement('input');
      emptyNameInput.type = 'text';
      emptyNameInput.placeholder = "Nova arma...";
      
      const emptySkillInput = document.createElement('input');
      emptySkillInput.type = 'number';
      emptySkillInput.placeholder = "%";
      
      const emptyDamageInput = document.createElement('input');
      emptyDamageInput.type = 'text';
      emptyDamageInput.placeholder = "Dano";
      
      const emptyRangeInput = document.createElement('input');
      emptyRangeInput.type = 'text';
      emptyRangeInput.placeholder = "Alcance";
      
      weaponGrid.appendChild(emptyNameInput);
      weaponGrid.appendChild(emptySkillInput);
      weaponGrid.appendChild(emptyDamageInput);
      weaponGrid.appendChild(emptyRangeInput);
    }
  }

  // --- Preencher Itens Pessoais ---
  const itemListContainer = document.querySelector('.item-list');
  if (itemListContainer) {
    itemListContainer.innerHTML = ''; // Limpa itens existentes
    
    // Define itens padrão caso não haja dados
    const itemsToDisplay = data.items && data.items.length > 0 ? data.items : [{}, {}, {}];
    
    itemsToDisplay.forEach(item => {
      const itemRow = document.createElement('div');
      itemRow.className = 'item-row';
      
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = item.name || '';
      nameInput.placeholder = "Item";
      nameInput.style.width = "70%";
      
      const quantityInput = document.createElement('input');
      quantityInput.type = 'text';
      quantityInput.value = item.quantity || '';
      quantityInput.placeholder = "Quantidade";
      quantityInput.style.width = "15%";
      
      const weightInput = document.createElement('input');
      weightInput.type = 'text';
      weightInput.value = item.weight || '';
      weightInput.placeholder = "Peso";
      weightInput.style.width = "15%";
      
      itemRow.appendChild(nameInput);
      itemRow.appendChild(quantityInput);
      itemRow.appendChild(weightInput);
      
      itemListContainer.appendChild(itemRow);
    });
    
    // Adiciona uma linha vazia no final para novo item
    if (data.items && data.items.length > 0) {
      const emptyItemRow = document.createElement('div');
      emptyItemRow.className = 'item-row';
      
      const emptyNameInput = document.createElement('input');
      emptyNameInput.type = 'text';
      emptyNameInput.placeholder = "Item";
      emptyNameInput.style.width = "70%";
      
      const emptyQuantityInput = document.createElement('input');
      emptyQuantityInput.type = 'text';
      emptyQuantityInput.placeholder = "Quantidade";
      emptyQuantityInput.style.width = "15%";
      
      const emptyWeightInput = document.createElement('input');
      emptyWeightInput.type = 'text';
      emptyWeightInput.placeholder = "Peso";
      emptyWeightInput.style.width = "15%";
      
      emptyItemRow.appendChild(emptyNameInput);
      emptyItemRow.appendChild(emptyQuantityInput);
      emptyItemRow.appendChild(emptyWeightInput);
      
      itemListContainer.appendChild(emptyItemRow);
    }
  }

  // --- CORREÇÃO: Preencher Perícias ---
  if (data.skills && data.skills.length > 0) {
    // Criar um mapa para acesso rápido às perícias por nome
    const skillMap = {};
    data.skills.forEach(skill => {
      if (skill.name) {
        skillMap[skill.name] = skill;
      }
    });
    
    // Atualizar cada perícia na interface
    document.querySelectorAll('.skill-item').forEach(skillItem => {
      const nameElement = skillItem.querySelector('.skill-name');
      if (!nameElement) return;
      
      const skillName = nameElement.textContent.trim();
      const skillData = skillMap[skillName];
      
      if (skillData) {
        // Atualiza o valor principal exibido
        const valueDisplay = skillItem.querySelector('.skill-value');
        if (valueDisplay) {
          valueDisplay.textContent = `${skillData.value}%`;
        }
        
        // Verifica e atualiza detalhes expandidos, se existirem
        const nextElement = skillItem.nextElementSibling;
        if (nextElement && nextElement.classList.contains('skill-details')) {
          const regularInput = nextElement.querySelector('.skill-regular');
          if (regularInput) {
            regularInput.value = skillData.value;
          }
          
          const halfElement = nextElement.querySelector('.skill-half');
          if (halfElement) {
            halfElement.textContent = `${skillData.half}%`;
          }
          
          const quarterElement = nextElement.querySelector('.skill-quarter');
          if (quarterElement) {
            quarterElement.textContent = `${skillData.quarter}%`;
          }
        }
      }
    });
  }

  // Atualiza valores derivados e barras de status
  if (typeof updateCharacterSheet === 'function') {
    updateCharacterSheet();
  } else {
    // Atualiza separadamente se as funções estiverem disponíveis
    if (typeof updateDerivedAttributes === 'function') {
      updateDerivedAttributes();
    }
    
    if (typeof updateStatusBars === 'function') {
      updateStatusBars();
    }
    
    if (typeof updateDynamicSkills === 'function') {
      updateDynamicSkills();
    }
  }
}