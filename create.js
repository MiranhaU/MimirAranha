
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

 document.addEventListener('DOMContentLoaded', () => {
    // Lista de perícias de Call of Cthulhu 7ª Edição
    const skills = [
        { name: "Antropologia", base: 1 },
        { name: "Arqueologia", base: 1 },
        { name: "Arremessar", base: 25 },
        { name: "Arte/Ofício", base: 5 },
        { name: "Artes Marciais", base: 1 },
        { name: "Astronomia", base: 1 },
        { name: "Barganha", base: 5 },
        { name: "Biologia", base: 1 },
        { name: "Charme", base: 15 },
        { name: "Chaveiro", base: 1 },
        { name: "Ciência", base: 1 },
        { name: "Contabilidade", base: 5 },
        { name: "Direito", base: 5 },
        { name: "Disfarce", base: 5 },
        { name: "Dirigir Automóveis", base: 20 },
        { name: "Eletrônica", base: 1 },
        { name: "Encontrar", base: 25 },
        { name: "Escalar", base: 20 },
        { name: "Escutar", base: 20 },
        { name: "Esquivar", base: 0 }, // Valor especial, será definido como metade da DEX
        { name: "Furtividade", base: 20 },
        { name: "Geologia", base: 1 },
        { name: "História", base: 5 },
        { name: "Intimidação", base: 15 },
        { name: "Lábia", base: 5 },
        { name: "Língua Materna", base: 0 }, // Valor especial, será definido como EDU x 5
        { name: "Língua (Outra)", base: 1 },
        { name: "Lutar (Briga)", base: 25 },
        { name: "Medicina", base: 1 },
        { name: "Mergulho", base: 1 },
        { name: "Ocultismo", base: 5 },
        { name: "Operar Maquinário", base: 1 },
        { name: "Persuasão", base: 10 },
        { name: "Pilotar", base: 1 },
        { name: "Prestidigitação", base: 10 },
        { name: "Primeiros Socorros", base: 30 },
        { name: "Psicologia", base: 10 },
        { name: "Psicanálise", base: 1 },
        { name: "Rastrear", base: 10 },
        { name: "Saltar", base: 20 },
        { name: "Sobrevivência", base: 10 },
        { name: "Sorte", base: 0 }, // Valor especial, será definido como POW x 5
        { name: "Natação", base: 20 },
        { name: "Usar Bibliotecas", base: 20 },
        { name: "Usar Computadores", base: 5 },
        { name: "Armas de Fogo (Pistola)", base: 20 },
        { name: "Armas de Fogo (Rifle/Espingarda)", base: 25 },
        { name: "Crédito", base: 0 }, // Valor especial, definido pelo jogador
    ];

    // Variáveis globais para armazenar informações do personagem
    let characterStats = {
        STR: 0, // Força (FOR)
        DEX: 0, // Destreza (DES)
        INT: 0, // Inteligência (INT)
        CON: 0, // Constituição (CON)
        APP: 0, // Aparência (APA)
        POW: 0, // Poder (POD)
        SIZ: 0, // Tamanho (TAM)
        EDU: 0, // Educação (EDU)
    };

    let derivedStats = {
        HP: 0, // Pontos de Vida
        SAN: 0, // Sanidade
        MP: 0, // Pontos de Magia
        DB: "", // Modificador de Dano
        BUILD: 0, // Corpo
        MOV: 0, // Movimento
    };

    let characterSkills = {};
    let selectedOccupation = "";
    let occupationPoints = 0;
    let interestPoints = 0;

    // Inicializar valores das perícias
    skills.forEach(skill => {
        characterSkills[skill.name] = skill.base;
    });

    // Navegação entre etapas
    const steps = document.querySelectorAll('.step');
    const stepContents = document.querySelectorAll('.step-content');
    const progressBar = document.getElementById('progress-bar');

    function updateProgress(step) {
        const percentage = ((step) / steps.length) * 100;
        progressBar.style.width = percentage + '%';
        progressBar.textContent = percentage.toFixed(1) + '%';
    }

    function navigateToStep(step) {
        steps.forEach(s => s.classList.remove('active'));
        stepContents.forEach(sc => sc.classList.remove('active'));
        
        steps[step-1].classList.add('active');
        document.getElementById(`step-${step}`).classList.add('active');
        
        updateProgress(step);
    }

    // Botões de navegação
    for (let i = 1; i <= 8; i++) {
        const nextBtn = document.getElementById(`next-${i}`);
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                // Validação antes de avançar
                if (validateStep(i)) {
                    navigateToStep(i + 1);
                }
            });
        }
        
        const prevBtn = document.getElementById(`prev-${i}`);
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                navigateToStep(i - 1);
            });
        }
    }

    // Validação das etapas
    function validateStep(step) {
        switch(step) {
            case 1:
                const charName = document.getElementById('charName').value;
                const playerName = document.getElementById('playerName').value;
                
                if (!charName) {
                    alert('Por favor, defina um nome para o seu personagem.');
                    return false;
                }
                if (!playerName) {
                    alert('Por favor, insira seu nome de jogador.');
                    return false;
                }
                return true;
                
            case 2:
                // Verificar se as características foram geradas
                if (characterStats.STR === 0) {
                    alert('Por favor, gere as características do personagem antes de continuar.');
                    return false;
                }
                return true;
                
            case 4:
                // Verificar se uma profissão foi selecionada
                if (!selectedOccupation) {
                    alert('Por favor, selecione uma profissão antes de continuar.');
                    return false;
                }
                return true;
                
            case 5:
                // Verificar se os pontos de perícia foram distribuídos
                if (occupationPoints > 0) {
                    alert(`Você ainda tem ${occupationPoints} pontos de profissão para distribuir.`);
                    return false;
                }
                return true;
                
            default:
                return true;
        }
    }

    // Passo 2: Gerar características
    document.getElementById('roll-stats').addEventListener('click', generateStats);

    function generateStats() {
        // Limpar container de características
        const statsContainer = document.getElementById('stats-container');
        statsContainer.innerHTML = '';
        
        // Gerar características aleatórias
        characterStats = {
            STR: rollDice(3, 6) * 5, // 3d6 × 5
            DEX: rollDice(3, 6) * 5, // 3d6 × 5
            INT: rollDice(2, 6) * 5 + 30, // (2d6+6) × 5
            CON: rollDice(3, 6) * 5, // 3d6 × 5
            APP: rollDice(3, 6) * 5, // 3d6 × 5
            POW: rollDice(3, 6) * 5, // 3d6 × 5
            SIZ: rollDice(2, 6) * 5 + 30, // (2d6+6) × 5
            EDU: rollDice(2, 6) * 5 + 30, // (2d6+6) × 5
        };
        
        // Criar e adicionar elementos para cada característica
        const statNames = {
            STR: "FOR (Força)",
            DEX: "DES (Destreza)",
            INT: "INT (Inteligência)",
            CON: "CON (Constituição)",
            APP: "APA (Aparência)",
            POW: "POD (Poder)",
            SIZ: "TAM (Tamanho)",
            EDU: "EDU (Educação)"
        };
        
        for (const stat in characterStats) {
            const statBox = document.createElement('div');
            statBox.className = 'stat-box';
            
            const statTitle = document.createElement('h3');
            statTitle.textContent = statNames[stat];
            
            const statValue = document.createElement('span');
            statValue.className = 'stat-value';
            statValue.textContent = characterStats[stat];
            
            const statInput = document.createElement('input');
            statInput.type = 'number';
            statInput.className = 'stat-input';
            statInput.value = characterStats[stat];
            statInput.min = 15;
            statInput.max = 90;
            statInput.dataset.stat = stat;
            statInput.addEventListener('change', updateStat);
            
            statBox.appendChild(statTitle);
            statBox.appendChild(statValue);
            statBox.appendChild(statInput);
            
            statsContainer.appendChild(statBox);
        }
        
        calculateDerivedStats();
        
        // Também atualizamos a perícia de Esquivar baseada na DES
        characterSkills["Esquivar"] = Math.floor(characterStats.DEX / 2);
        // E Língua Materna baseada na EDU
        characterSkills["Língua Materna"] = characterStats.EDU;
        // E Sorte baseada no POD
        characterSkills["Sorte"] = characterStats.POW;
        
        // Calcular pontos de interesse
        interestPoints = characterStats.INT * 2;
        document.getElementById('interest-skill-points').textContent = interestPoints;
    }

    // Função para atualizar uma característica quando o valor é alterado manualmente
    function updateStat(e) {
        const stat = e.target.dataset.stat;
        const value = parseInt(e.target.value);
        
        if (value < 15) {
            e.target.value = 15;
            characterStats[stat] = 15;
        } else if (value > 90) {
            e.target.value = 90;
            characterStats[stat] = 90;
        } else {
            characterStats[stat] = value;
        }
        
        // Atualizar a exibição
        e.target.previousElementSibling.textContent = characterStats[stat];
        
        // Recalcular atributos derivados
        calculateDerivedStats();
        
        // Atualizar pontos de interesse
        interestPoints = characterStats.INT * 2;
        document.getElementById('interest-skill-points').textContent = interestPoints;
    }

    // Função para simular rolagem de dados
    function rollDice(numDice, sides) {
        let total = 0;
        for (let i = 0; i < numDice; i++) {
            total += Math.floor(Math.random() * sides) + 1;
        }
        return total;
    }

    // Calcular atributos derivados
    function calculateDerivedStats() {
        // Pontos de Vida (CON + TAM) ÷ 10, arredondado para baixo
        derivedStats.HP = Math.floor((characterStats.CON + characterStats.SIZ) / 10);
        
        // Sanidade igual ao POD, máximo 99
        derivedStats.SAN = Math.min(characterStats.POW, 99);
        
        // Pontos de Magia POD ÷ 5
        derivedStats.MP = Math.floor(characterStats.POW / 5);
        
        // Modificador de Dano baseado em FOR + TAM
        const sumForSiz = characterStats.STR + characterStats.SIZ;
        if (sumForSiz < 65) derivedStats.DB = "-2";
        else if (sumForSiz < 85) derivedStats.DB = "-1";
        else if (sumForSiz < 125) derivedStats.DB = "0";
        else if (sumForSiz < 165) derivedStats.DB = "+1D4";
        else if (sumForSiz < 205) derivedStats.DB = "+1D6";
        else derivedStats.DB = "+2D6";
        
        // Corpo baseado em FOR + TAM
        if (sumForSiz < 65) derivedStats.BUILD = -2;
        else if (sumForSiz < 85) derivedStats.BUILD = -1;
        else if (sumForSiz < 125) derivedStats.BUILD = 0;
        else if (sumForSiz < 165) derivedStats.BUILD = 1;
        else if (sumForSiz < 205) derivedStats.BUILD = 2;
        else derivedStats.BUILD = 3;
        
        // Movimento baseado em DEX, FOR e TAM
        // Regra: Se ambos DEX e FOR < TAM, MOV = 7
        // Se TAM > FOR ou DEX, MOV = 8
        // Se TAM < FOR e DEX, MOV = 9
        // Ajustes de idade são aplicados depois
        const age = parseInt(document.getElementById('age').value) || 35;
        let baseMov;
        
        if (characterStats.DEX < characterStats.SIZ && characterStats.STR < characterStats.SIZ) {
            baseMov = 7;
        } else if (characterStats.SIZ > characterStats.STR || characterStats.SIZ > characterStats.DEX) {
            baseMov = 8;
        } else {
            baseMov = 9;
        }
        
        // Ajuste de idade
        if (age >= 40 && age < 50) baseMov -= 1;
        else if (age >= 50 && age < 60) baseMov -= 2;
        else if (age >= 60 && age < 70) baseMov -= 3;
        else if (age >= 70 && age < 80) baseMov -= 4;
        else if (age >= 80) baseMov -= 5;
        
        derivedStats.MOV = Math.max(1, baseMov); // Mínimo de 1
        
        // Atualizar valores na interface
        document.getElementById('hp-value').textContent = derivedStats.HP;
        document.getElementById('san-value').textContent = derivedStats.SAN;
        document.getElementById('mp-value').textContent = derivedStats.MP;
        document.getElementById('db-value').textContent = derivedStats.DB;
        document.getElementById('build-value').textContent = derivedStats.BUILD;
        document.getElementById('mov-value').textContent = derivedStats.MOV;
    }

    // Passo 4: Seleção de profissão
    const occupationCards = document.querySelectorAll('.occupation-card');
    occupationCards.forEach(card => {
        card.addEventListener('click', selectOccupation);
    });

    function selectOccupation(e) {
        // Remover seleção anterior
        occupationCards.forEach(card => card.classList.remove('selected'));
        
        // Adicionar seleção
        e.currentTarget.classList.add('selected');
        
        // Guardar profissão selecionada
        selectedOccupation = e.currentTarget.dataset.occupation;
        
        // Calcular pontos de profissão
        switch(selectedOccupation) {
            case 'antiquarian':
                occupationPoints = characterStats.EDU * 4;
                break;
            case 'author':
                occupationPoints = characterStats.EDU * 4;
                break;
            case 'detective':
                occupationPoints = characterStats.EDU * 2 + characterStats.DEX * 2;
                break;
            case 'doctor':
                occupationPoints = characterStats.EDU * 4;
                break;
            case 'professor':
                occupationPoints = characterStats.EDU * 4;
                break;
            case 'police':
                occupationPoints = characterStats.EDU * 2 + characterStats.DEX * 2;
                break;
            default:
                // Profissão personalizada
                occupationPoints = characterStats.EDU * 4;
        }
        
        // Atualizar interface
        document.getElementById('occupation-points').textContent = occupationPoints;
        document.getElementById('prof-skill-points').textContent = occupationPoints;
    }

    // Passo 5: Perícias
    function populateSkills() {
        const skillList = document.getElementById('skill-list');
        skillList.innerHTML = '';
        
        skills.forEach(skill => {
            const skillRow = document.createElement('div');
            skillRow.className = 'skill-row';
            
            const skillName = document.createElement('div');
            skillName.className = 'skill-name';
            skillName.textContent = skill.name;
            
            const skillBase = document.createElement('div');
            skillBase.className = 'skill-base';
            skillBase.textContent = skill.base + '%';
            
            const skillValue = document.createElement('div');
            skillValue.className = 'skill-value';
            
            const skillInput = document.createElement('input');
            skillInput.type = 'number';
            skillInput.className = 'stat-input';
            skillInput.min = skill.base;
            skillInput.max = 75;
            skillInput.value = characterSkills[skill.name];
            skillInput.dataset.skill = skill.name;
            skillInput.dataset.base = skill.base;
            skillInput.addEventListener('change', updateSkill);
            
            skillValue.appendChild(skillInput);
            
            skillRow.appendChild(skillName);
            skillRow.appendChild(skillBase);
            skillRow.appendChild(skillValue);
            
            skillList.appendChild(skillRow);
        });
    }

    // Função para atualizar uma perícia quando o valor é alterado
    function updateSkill(e) {
        const skill = e.target.dataset.skill;
        const base = parseInt(e.target.dataset.base);
        let value = parseInt(e.target.value);
        
        // Validar mínimo e máximo
        if (value < base) {
            e.target.value = base;
            value = base;
        } else if (value > 75 && skill !== "Sorte" && skill !== "Crédito") {
            e.target.value = 75;
            value = 75;
        }
        
        // Calcular pontos gastos nesta perícia
        const pointsSpent = value - base;
        
        // Atualizar pontos de profissão/interesse
        // Este é um exemplo simplificado, você precisa rastrear quais pontos foram gastos em quais perícias
        if (selectedOccupation) {
            occupationPoints -= pointsSpent;
            document.getElementById('prof-skill-points').textContent = occupationPoints;
        }
        
        // Atualizar valor da perícia
        characterSkills[skill] = value;
    }

    // Filtrar perícias
    document.getElementById('skill-search').addEventListener('input', filterSkills);

    function filterSkills(e) {
        const searchText = e.target.value.toLowerCase();
        const skillRows = document.querySelectorAll('.skill-row');
        
        skillRows.forEach(row => {
            const skillName = row.querySelector('.skill-name').textContent.toLowerCase();
            if (skillName.includes(searchText)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Passo 6: Equipamento
    document.getElementById('add-item').addEventListener('click', addItemField);
    document.getElementById('add-weapon').addEventListener('click', addWeaponField);

    function addItemField() {
        const personalItems = document.getElementById('personal-items');
        const itemCount = personalItems.children.length + 1;
        
        const itemGroup = document.createElement('div');
        itemGroup.className = 'input-group';
        
        const itemLabel = document.createElement('label');
        itemLabel.setAttribute('for', `item-${itemCount}`);
        itemLabel.textContent = `Item ${itemCount}:`;
        
        const itemInput = document.createElement('input');
        itemInput.type = 'text';
        itemInput.id = `item-${itemCount}`;
        itemInput.placeholder = 'Ex: Amuleto, Livro, etc.';
        
        itemGroup.appendChild(itemLabel);
        itemGroup.appendChild(itemInput);
        
        personalItems.appendChild(itemGroup);
    }

    function addWeaponField() {
        const weapons = document.getElementById('weapons');
        const weaponCount = weapons.children.length + 1;
        
        const weaponGroup = document.createElement('div');
        weaponGroup.className = 'input-group';
        
        const weaponLabel = document.createElement('label');
        weaponLabel.setAttribute('for', `weapon-${weaponCount}`);
        weaponLabel.textContent = `Arma ${weaponCount}:`;
        
        const weaponInput = document.createElement('input');
        weaponInput.type = 'text';
        weaponInput.id = `weapon-${weaponCount}`;
        weaponInput.placeholder = 'Ex: Faca, Revólver, etc.';
        
        weaponGroup.appendChild(weaponLabel);
        weaponGroup.appendChild(weaponInput);
        
        weapons.appendChild(weaponGroup);
    }

    // Passo 8: Finalização
    document.getElementById('finalize').addEventListener('click', finalizeCharacter);

    function finalizeCharacter() {
        // Coletar todos os dados do personagem
        const charName = document.getElementById('charName').value;
        const playerName = document.getElementById('playerName').value;
        const age = document.getElementById('age').value;
        const sex = document.getElementById('sex').value;
        const birthplace = document.getElementById('birthplace').value;
        const background = document.getElementById('background').value;
        const ideology = document.getElementById('ideology').value;
        const significantPeople = document.getElementById('significant-people').value;
        const meaningfulLocations = document.getElementById('meaningful-locations').value;
        const treasuredPossessions = document.getElementById('treasured-possessions').value;
        const traits = document.getElementById('traits').value;
        
        // Criar resumo do personagem
        const characterSummary = document.getElementById('character-summary');
        characterSummary.innerHTML = `
            <div class="summary-section">
                <h3>Informações Básicas</h3>
                <p><strong>Nome:</strong> ${charName}</p>
                <p><strong>Jogador:</strong> ${playerName}</p>
                <p><strong>Idade:</strong> ${age}</p>
                <p><strong>Sexo:</strong> ${sex}</p>
                <p><strong>Local de Nascimento:</strong> ${birthplace}</p>
                <p><strong>Profissão:</strong> ${selectedOccupation ? selectedOccupation.charAt(0).toUpperCase() + selectedOccupation.slice(1) : "Personalizada"}</p>
            </div>
            
            <div class="summary-section">
                <h3>Características</h3>
                <div class="summary-stats">
                    <p><strong>FOR:</strong> ${characterStats.STR}</p>
                    <p><strong>DES:</strong> ${characterStats.DEX}</p>
                    <p><strong>INT:</strong> ${characterStats.INT}</p>
                    <p><strong>CON:</strong> ${characterStats.CON}</p>
                    <p><strong>APA:</strong> ${characterStats.APP}</p>
                    <p><strong>POD:</strong> ${characterStats.POW}</p>
                    <p><strong>TAM:</strong> ${characterStats.SIZ}</p>
                    <p><strong>EDU:</strong> ${characterStats.EDU}</p>
                </div>
            </div>
            
            <div class="summary-section">
                <h3>Atributos Derivados</h3>
                <div class="summary-stats">
                    <p><strong>PV:</strong> ${derivedStats.HP}</p>
                    <p><strong>SAN:</strong> ${derivedStats.SAN}</p>
                    <p><strong>PM:</strong> ${derivedStats.MP}</p>
                    <p><strong>MD:</strong> ${derivedStats.DB}</p>
                    <p><strong>Corpo:</strong> ${derivedStats.BUILD}</p>
                    <p><strong>MOV:</strong> ${derivedStats.MOV}</p>
                </div>
            </div>
            
            <div class="summary-section">
                <h3>História</h3>
                <p>${background}</p>
                <p><strong>Ideologia/Crenças:</strong> ${ideology}</p>
                <p><strong>Pessoas Significativas:</strong> ${significantPeople}</p>
                <p><strong>Locais Importantes:</strong> ${meaningfulLocations}</p>
                <p><strong>Posses Valiosas:</strong> ${treasuredPossessions}</p>
                <p><strong>Traços:</strong> ${traits}</p>
            </div>
        `;
        
        // Aqui você poderia enviar os dados para o servidor
        // ou redirecionar para a página da ficha
        
        alert('Personagem criado com sucesso! Você será redirecionado para a ficha completa.');
        // Redirecionar para a ficha (descomente quando tiver uma página real)
        // window.location.href = 'character-sheet.html?id=123';
    }

    document.getElementById('finalize').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;

  // Coletando detalhes do histórico/personalidade
  const background = document.getElementById('background')?.value || '';
  const ideology = document.getElementById('ideology')?.value || '';
  const significantPeople = document.getElementById('significant-people')?.value || '';
  const meaningfulLocations = document.getElementById('meaningful-locations')?.value || '';
  const treasuredPossessions = document.getElementById('treasured-possessions')?.value || '';
  const traits = document.getElementById('traits')?.value || '';

  // Coleta itens pessoais
  const items = [];
  const itemElements = document.querySelectorAll('#personal-items input[type="text"]');
  itemElements.forEach(item => {
    if (item.value.trim()) {
      items.push({
        name: item.value.trim(),
        quantity: "1",
        weight: ""
      });
    }
  });

  // Coleta armas
  const weapons = [];
  const weaponNameElements = document.querySelectorAll('#weapons input[type="text"]');
  weaponNameElements.forEach((weaponElem, index) => {
    if (weaponElem.value.trim()) {
      weapons.push({
        name: weaponElem.value.trim(),
        skillPercent: characterSkills["Lutar (Briga)"] || "25", // Assume perícia de Briga como padrão
        damage: "1d3 + " + derivedStats.DB,  // Dano padrão + modificador
        range: "Toque"
      });
    }
  });

  // Adiciona soco/chute padrão se não houver armas
  if (weapons.length === 0) {
    weapons.push({
      name: "Soco/Chute",
      skillPercent: "25",
      damage: "1d3 + " + derivedStats.DB,
      range: "Toque"
    });
  }

  // Mapeia o nome da profissão de código para texto legível
  let occupationName = "Personalizada";
  switch(selectedOccupation) {
    case 'antiquarian': occupationName = "Antiquário"; break;
    case 'author': occupationName = "Autor"; break;
    case 'detective': occupationName = "Detetive"; break;
    case 'doctor': occupationName = "Médico"; break;
    case 'professor': occupationName = "Professor"; break;
    case 'police': occupationName = "Policial"; break;
  }

  // Estrutura de dados completa, compatível com a ficha principal
  const fichaData = {
    // Informações básicas
    charName: document.getElementById('charName').value,
    playerName: document.getElementById('playerName').value,
    occupation: occupationName,
    age: document.getElementById('age')?.value || '35',
    sex: document.getElementById('sex')?.value || '',
    birthplace: document.getElementById('birthplace')?.value || '',
    
    // Características
    str: characterStats.STR,
    dex: characterStats.DEX,
    int: characterStats.INT,
    con: characterStats.CON,
    app: characterStats.APP,
    pow: characterStats.POW,
    siz: characterStats.SIZ,
    edu: characterStats.EDU,
    luck: characterStats.POW, // Sorte inicial igual ao POD
    
    // Status e valores derivados
    maxHP: derivedStats.HP,
    currentHP: derivedStats.HP,
    maxMP: derivedStats.MP,
    currentMP: derivedStats.MP,
    currentSAN: derivedStats.SAN,
    maxSAN: 99, // Valor máximo de SAN
    movValue: derivedStats.MOV,
    dbValue: derivedStats.DB,
    buildValue: derivedStats.BUILD,
    
    // Histórico e personalidade
    personalDescription: background,
    ideologyBeliefs: ideology,
    significantPeople: significantPeople,
    significantLocations: meaningfulLocations,
    treasuredPossessions: treasuredPossessions,
    traits: traits,
    
    // Equipamentos e recursos
    cash: "0",
    spendingLevel: "",
    gearNotes: treasuredPossessions,
    
    // Perícias formatadas corretamente
    skills: Object.entries(characterSkills).map(([name, value]) => ({
      name,
      value: String(value),
      half: String(Math.floor(value / 2)),
      quarter: String(Math.floor(value / 4))
    })),
    
    // Armas e itens
    weapons: weapons,
    items: items
  };

  try {
    // Salva no Firebase
    await setDoc(doc(db, 'fichas', user.uid), fichaData);
    console.log("Ficha do personagem salva com sucesso!");
    
    // Limpa flag de primeiro login e redireciona
    localStorage.removeItem('firstLogin');
    alert('Personagem criado com sucesso! Você será redirecionado para a ficha completa.');
    window.location.href = 'index.html';
  } catch (error) {
    console.error("Erro ao salvar a ficha:", error);
    alert('Ocorreu um erro ao salvar seu personagem. Por favor, tente novamente.');
  }
});
    // Inicialização
    document.getElementById('age').addEventListener('change', calculateDerivedStats);
    
    // Carregar as perícias quando estiver na tela correspondente
    document.getElementById('next-4').addEventListener('click', populateSkills);
    
    // Inicializar o valor do crédito no passo 6
    document.getElementById('next-5').addEventListener('click', () => {
        document.getElementById('credit-rating').textContent = characterSkills["Crédito"] || 0;
    });
    
    // Inicializar o progresso
    updateProgress(1);
});