

document.addEventListener('DOMContentLoaded', () => {
    // =========================
    //    EXTERNAL SIGNALS
    // =========================
    
    // Constants for localStorage
    const PM_UNLOCK_KEY = "pm_unlocked_fichas";
    
    // Function to check if MP is unlocked for this character sheet
    function isFichaPMUnlocked(fichaId) {
        try {
            const map = JSON.parse(localStorage.getItem(PM_UNLOCK_KEY)) || {};
            return !!map[fichaId];
        } catch {
            return false;
        }
    }
    
    // Listen for external signals (e.g., postMessage)
    window.addEventListener("message", function(event) {
        if (event.data && 
            event.data.action === "unlock_mp_fields" && 
            event.data.characterId === tempFichaId) {
            unlockMPInputs(true);
        }
    });
    
    // Listen for localStorage changes
    window.addEventListener("storage", function(event) {
        if (event.key === PM_UNLOCK_KEY || event.key === "pm_toggle_event") {
            const isUnlocked = isFichaPMUnlocked(tempFichaId);
            unlockMPInputs(isUnlocked, false);
        }
    });
    
    // Function to unlock only MP fields
    function unlockMPInputs(unlock = true, showNotification = true) {
        const currentMP = document.getElementById('currentMP');
        const maxMP = document.getElementById('maxMP');
        
        if (currentMP) {
            if (unlock) {
                currentMP.removeAttribute('readonly');
                currentMP.removeAttribute('disabled');
                currentMP.style.pointerEvents = 'auto';
            } else {
                currentMP.setAttribute('readonly', 'readonly');
                currentMP.setAttribute('disabled', 'disabled');
                currentMP.style.pointerEvents = 'none';
            }
        }
        
        if (maxMP) {
            if (unlock) {
                maxMP.removeAttribute('readonly');
                maxMP.removeAttribute('disabled');
                maxMP.style.pointerEvents = 'auto';
            } else {
                maxMP.setAttribute('readonly', 'readonly');
                maxMP.setAttribute('disabled', 'disabled');
                maxMP.style.pointerEvents = 'none';
            }
        }
        
        // Also handle MP-related buttons
        document.querySelectorAll('.arrow-button[data-target="magic"]').forEach(button => {
            if (unlock) {
                button.removeAttribute('disabled');
                button.style.opacity = '1';
                button.style.pointerEvents = 'auto';
            } else {
                button.setAttribute('disabled', 'disabled');
                button.style.opacity = '0.5';
                button.style.pointerEvents = 'none';
            }
        });
        
        // Show a notification if requested
        if (showNotification) {
            const notification = document.createElement('div');
            notification.textContent = unlock ? 'Pontos de Magia desbloqueados' : 'Pontos de Magia bloqueados';
            notification.style = `background:${unlock ? '#4CAF50' : '#F44336'}; color:white; padding:8px; text-align:center; position:fixed; bottom:20px; right:20px; z-index:1000; border-radius:4px; box-shadow:0 2px 5px rgba(0,0,0,0.2);`;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
    }
    
    // =========================
    //    TEMPORARY FICHA
    // =========================
    
    // Helper to parse query parameters
    function getQueryParam(name) {
        const url = new URL(window.location.href);
        return url.searchParams.get(name);
    }
    
    // Check if we're viewing a temporary character sheet
    const tempFichaId = getQueryParam('tempFichaId');
    let isReadOnlyMode = false;
    
    if (tempFichaId) {
        // Load temp ficha data
        const tempFichaData = localStorage.getItem(`temp_ficha_${tempFichaId}`);
        if (tempFichaData) {
            const fichaObject = JSON.parse(tempFichaData);
            isReadOnlyMode = true;
            
            // Helper function to set field values
            function setField(id, value) {
                let el = document.getElementById(id);
                if (el) {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = value;
                    else el.textContent = value;
                }
            }
            
            // Populate character information
            setField('charName', fichaObject.charName || '');
            setField('playerName', fichaObject.playerName || '');
            setField('occupation', fichaObject.occupation || '');
            setField('age', fichaObject.age || '');
            setField('sex', fichaObject.sex || '');
            setField('birthplace', fichaObject.birthplace || '');
            
            // Populate characteristics
            setField('str', fichaObject.str || 0);
            setField('con', fichaObject.con || 0);
            setField('siz', fichaObject.siz || 0);
            setField('dex', fichaObject.dex || 0);
            setField('app', fichaObject.app || 0);
            setField('int', fichaObject.int || 0);
            setField('pow', fichaObject.pow || 0);
            setField('edu', fichaObject.edu || 0);
            setField('luck', fichaObject.luck || 0);
            
            // Populate status values
            setField('currentHP', fichaObject.currentHP || 0);
            setField('maxHP', fichaObject.maxHP || 0);
            setField('currentSAN', fichaObject.currentSAN || 0);
            setField('currentMP', fichaObject.currentMP || 0);
            setField('maxMP', fichaObject.maxMP || 0);
            
            // Show a banner that this is a read-only view
            let banner = document.createElement('div');
            banner.textContent = 'VISUALIZAÇÃO TEMPORÁRIA (leitura apenas)';
            banner.style = 'background:#ffc107; color:#222; padding:8px; text-align:center; font-weight:bold; position:sticky; top:0; z-index:1000;';
            document.body.insertBefore(banner, document.body.firstChild);
            
            // We'll make the sheet read-only after the DOM is fully loaded
            window.setTimeout(() => {
                // Make all inputs read-only
                document.querySelectorAll('input, textarea, select').forEach(el => {
                    el.setAttribute('readonly', 'readonly');
                    el.setAttribute('disabled', 'disabled');
                });
                
                // Hide action buttons
                ['add-weapon', 'add-item'].forEach(id => {
                    let el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                });
                
                // Populate skills if they exist in the data
                if (fichaObject.skills && Array.isArray(fichaObject.skills)) {
                    document.querySelectorAll('.skill-item').forEach(skillItem => {
                        const skillName = skillItem.querySelector('.skill-name').textContent;
                        const skillData = fichaObject.skills.find(s => s.name === skillName);
                        
                        if (skillData) {
                            const skillValueEl = skillItem.querySelector('.skill-value');
                            const skillRegularInput = skillItem.querySelector('.skill-regular');
                            
                            if (skillValueEl) skillValueEl.textContent = skillData.value + '%';
                            if (skillRegularInput) {
                                skillRegularInput.value = skillData.value;
                                updateSkillDerived(skillRegularInput);
                            }
                        }
                    });
                }
                
                // Update all derived values and status bars
                updateCharacterSheet();
            }, 100);
        }
    }

    // =========================
    //       CONSTANTES
    // =========================

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

    // Categoria das perícias
    const skillCategories = {
        combat: ['Arremessar', 'Armas de Fogo (Pistola)', 'Armas de Fogo (Rifle)', 'Artes Marciais', 'Esquiva'],
        social: ['Barganha', 'Crédito', 'Disfarce', 'Lábia', 'Persuadir', 'Psicologia', 'Psicanálise'],
        academic: ['Antropologia', 'Arqueologia', 'Astronomia', 'Biologia', 'Contabilidade', 'Direito', 'Farmácia', 'Física', 'Geologia', 'História', 'História Natural', 'Língua Nativa', 'Medicina', 'Mitos de Cthulhu', 'Ocultismo', 'Pesquisar Biblioteca'],
        physical: ['Cavalgar', 'Dirigir Automóvel', 'Escalar', 'Nadar', 'Navegar', 'Pulo', 'Rastrear'],
        practical: ['Chaveiro', 'Esconder', 'Escutar', 'Fotografia', 'Furtividade', 'Localizar', 'Ocultar', 'Primeiros Socorros', 'Reparo Elétrico', 'Reparo Mecânico']
    };

    
    // Check MP unlock status when page loads
    if (tempFichaId) {
        const isUnlocked = isFichaPMUnlocked(tempFichaId);
        unlockMPInputs(isUnlocked, false);
    }
    
    // =========================
    //      MODAL DADO
    // =========================

    // Função utilitária para criar um botão de dado padronizado
    function createDiceButton(title) {
        const button = document.createElement('button');
        button.className = 'dice-button';
        button.title = title;
        button.innerHTML = `<img src="dado.png" alt="Rolar dado" class="dice-icon">`;
        return button;
    }

    // Função que trata a lógica de rolagem (customizada para skills/características)
    function handleDiceRoll(skillName, value, diceHistoryArea) {
        const roll = Math.floor(Math.random() * 100) + 1;
        let result = 'Falha';
        if (typeof value === 'string' && value.includes('%')) {
            value = parseInt(value.replace('%',''));
        } else {
            value = parseInt(value) || 0;
        }
        
        if (roll <= value) {
            result = roll <= Math.floor(value / 4) ? 'Ótimo Sucesso!' :
                     roll <= Math.floor(value / 2) ? 'Bom Sucesso!' : 'Sucesso';
        } else if (roll === 100 || (value < 50 && roll > 95)) {
            result = 'Desastre!';
        }
        showDiceResult(skillName, roll, result, diceHistoryArea);
    }

    function createDiceResultModal() {
        const modal = document.createElement('div');
        modal.className = 'dice-result-modal hidden';
        modal.innerHTML = `
            <div class="dice-result-card">
                <div class="dice-result-content">
                    <div class="dice-result-title">Resultado</div>
                    <div class="dice-result-value"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    createDiceResultModal();

    // =========================
    //    CAMPOS EDITÁVEIS
    // =========================

    function setupEditableValues() {
        document.querySelectorAll('.editable-value').forEach(element => {
            // Skip setup if we're in read-only mode
            if (isReadOnlyMode) return;
            
            element.addEventListener('blur', function () {
                let value = parseInt(this.textContent) || 0;
                const id = this.id;
                if (id === 'currentHP') {
                    const maxHP = parseInt(document.getElementById('maxHP').textContent) || 0;
                    value = Math.min(Math.max(0, value), maxHP);
                } else if (id === 'currentSAN') {
                    value = Math.min(Math.max(0, value), 99);
                } else if (id === 'currentMP') {
                    const maxMP = parseInt(document.getElementById('maxMP').textContent) || 0;
                    value = Math.min(Math.max(0, value), maxMP);
                }
                this.textContent = value;
                updateStatusBarsFromText();
            });
            element.addEventListener('keypress', function (e) {
                const charCode = e.which || e.keyCode;
                if (charCode < 48 || charCode > 57) e.preventDefault();
            });
        });
    }

    // =========================
    //      BOTÕES SETA
    // =========================

    function setupArrowButtons() {
        document.querySelectorAll('.arrow-button').forEach(button => {
            // Skip setup if we're in read-only mode
            if (isReadOnlyMode) {
                button.style.display = 'none';
                return;
            }
            
            button.addEventListener('click', function () {
                const target = this.getAttribute('data-target');
                const value = parseInt(this.getAttribute('data-value'));
                let currentElement, maxValue;
                if (target === 'health') {
                    currentElement = document.getElementById('currentHP');
                    maxValue = parseInt(document.getElementById('maxHP').textContent) || 0;
                } else if (target === 'sanity') {
                    currentElement = document.getElementById('currentSAN');
                    maxValue = 99;
                } else if (target === 'magic') {
                    currentElement = document.getElementById('currentMP');
                    maxValue = parseInt(document.getElementById('maxMP').textContent) || 0;
                }
                if (currentElement) {
                    let currentValue = parseInt(currentElement.textContent) || 0;
                    currentValue += value;
                    currentValue = Math.min(Math.max(0, currentValue), maxValue);
                    currentElement.textContent = currentValue;
                    updateStatusBarsFromText();
                }
            });
        });
    }

    // =========================
    //   BLOQUEIO DE MAGIA
    // =========================

    function setupMagicLock() {
        const magicLock = document.querySelector('.magic-lock');
        if (!magicLock) return;
        
        // Hide magic lock button in read-only mode
        if (isReadOnlyMode) {
            magicLock.style.display = 'none';
            return;
        }
        
        // Set initial state based on localStorage
        if (tempFichaId) {
            const isUnlocked = isFichaPMUnlocked(tempFichaId);
            const magicContainer = document.querySelector('.magic-container');
            if (magicContainer) {
                if (isUnlocked) {
                    magicContainer.classList.remove('locked');
                    document.querySelector('.unlock-text').textContent = 'Bloquear magia';
                } else {
                    magicContainer.classList.add('locked');
                    document.querySelector('.unlock-text').textContent = 'Desbloquear magia';
                }
            }
        }
        
        magicLock.addEventListener('click', () => {
            const magicContainer = document.querySelector('.magic-container');
            if (!magicContainer) return;
            
            const willBeLocked = !magicContainer.classList.contains('locked');
            magicContainer.classList.toggle('locked');
            document.querySelector('.unlock-text').textContent = willBeLocked
                ? 'Desbloquear magia' : 'Bloquear magia';
                
            // Update localStorage
            if (tempFichaId) {
                try {
                    const map = JSON.parse(localStorage.getItem(PM_UNLOCK_KEY)) || {};
                    if (!willBeLocked) {
                        map[tempFichaId] = true;
                    } else {
                        delete map[tempFichaId];
                    }
                    localStorage.setItem(PM_UNLOCK_KEY, JSON.stringify(map));
                    
                    // Trigger storage event for other tabs
                    localStorage.setItem("pm_toggle_event", Date.now().toString());
                    setTimeout(() => localStorage.removeItem("pm_toggle_event"), 100);
                } catch (e) {
                    console.error("Error updating MP unlock status:", e);
                }
            }
            
            // If unlocking via button, also make sure fields are editable
            unlockMPInputs(!willBeLocked);
        });
    }

    // =========================
    //   STATUS PROGRESS BARS
    // =========================

    function updateStatusBarsFromText() {
        const currentHP = parseInt(document.getElementById('currentHP').textContent) || 0;
        const maxHP = parseInt(document.getElementById('maxHP').textContent) || 1;
        const currentSAN = parseInt(document.getElementById('currentSAN').textContent) || 0;
        const maxSAN = 99;
        const currentMP = parseInt(document.getElementById('currentMP').textContent) || 0;
        const maxMP = parseInt(document.getElementById('maxMP').textContent) || 1;
        document.getElementById('healthFill').style.width = (currentHP / maxHP * 100) + '%';
        document.getElementById('sanityFill').style.width = (currentSAN / maxSAN * 100) + '%';
        document.getElementById('magicFill').style.width = (currentMP / maxMP * 100) + '%';
    }

    function updateStatusBars() {
        const maxHP = parseInt(document.getElementById('maxHP').textContent) || 1;
        const maxMP = parseInt(document.getElementById('maxMP').textContent) || 1;
        const pow = parseInt(document.getElementById('pow').value) || 0;
        let currentHP = parseInt(document.getElementById('currentHP').textContent) || 0;
        currentHP = Math.min(currentHP, maxHP);
        document.getElementById('currentHP').textContent = currentHP;

        let currentMP = parseInt(document.getElementById('currentMP').textContent) || 0;
        currentMP = Math.min(currentMP, maxMP);
        document.getElementById('currentMP').textContent = currentMP;

        let currentSAN = parseInt(document.getElementById('currentSAN').textContent) || 0;
        if (currentSAN === 0) {
            currentSAN = pow;
            document.getElementById('currentSAN').textContent = currentSAN;
        }

        document.getElementById('healthFill').style.width = (currentHP / Math.max(1, maxHP) * 100) + '%';
        document.getElementById('sanityFill').style.width = (currentSAN / 99 * 100) + '%';
        document.getElementById('magicFill').style.width = (currentMP / Math.max(1, maxMP) * 100) + '%';
    }

    // =========================
    //     HISTÓRICO DADOS
    // =========================

    function createDiceHistoryArea(skillsList) {
        let diceHistoryArea = document.createElement('div');
        diceHistoryArea.className = 'dice-history-area';
        diceHistoryArea.innerHTML = `<div class="dice-history-title">Histórico de Rolagens</div><div class="dice-history-list"></div>`;
        skillsList.parentNode.appendChild(diceHistoryArea);
        return diceHistoryArea;
    }

    function addToDiceHistory(diceHistoryArea, text) {
        const historyList = diceHistoryArea.querySelector('.dice-history-list');
        const entry = document.createElement('div');
        entry.className = 'dice-history-entry';
        entry.textContent = text;
        historyList.insertBefore(entry, historyList.firstChild);
        if (historyList.children.length > 20) historyList.removeChild(historyList.lastChild);
    }

    function showDiceResult(skillName, roll, result, diceHistoryArea) {
        const resultModal = document.querySelector('.dice-result-modal');
        if (!resultModal) return;
        const resultValue = resultModal.querySelector('.dice-result-value');
        resultValue.innerHTML = `
            <div class="roll-skill">${skillName}</div>
            <div class="roll-number">${roll}</div>
            <div class="roll-result ${result.toLowerCase().replace(/\s+/g, '-')}">${result}</div>
        `;
        resultModal.classList.remove('hidden');
        addToDiceHistory(diceHistoryArea, `[ (${roll}) ${result} - ${skillName} ]`);
    }

    function setupOutsideModalClose() {
        document.addEventListener('click', function (e) {
            const resultModal = document.querySelector('.dice-result-modal');
            if (resultModal && !resultModal.classList.contains('hidden')
                && !e.target.closest('.dice-result-card')) {
                resultModal.classList.add('hidden');
            }
        });
    }

    // =========================
    //    GERAÇÃO PERÍCIAS
    // =========================

    function getDynamicBase(skill, statValues) {
        if (skill.dynamic === "dexHalf") {
            return Math.floor(statValues.dex / 2);
        }
        if (skill.dynamic === "edu") {
            return statValues.edu;
        }
        return skill.base;
    }

    function createSkillElements(skillsList, statValues, diceHistoryArea) {
        skills.forEach(skill => {
            const baseValue = skill.dynamic ? getDynamicBase(skill, statValues) : skill.base;
            const skillDiv = document.createElement('div');
            skillDiv.className = 'skill-item';
            skillDiv.innerHTML = `
                <div class="skill-header">
                    <span class="skill-name">${skill.name}</span>
                    <div class="skill-value-container">
                        <span class="skill-value">${baseValue}%</span>
                        <button class="dice-button" title="Rolar ${skill.name}">
                            <img src="dado.png" alt="Rolar dado" class="dice-icon">
                        </button>
                    </div>
                </div>
                <div class="skill-details hidden">
                    <div class="skill-level"><div class="skill-level-title">Regular</div>
                        <input type="number" class="skill-regular" value="${baseValue}" min="0" max="99"></div>
                    <div class="skill-level"><div class="skill-level-title">Bom</div>
                        <div class="skill-level-value skill-half">${Math.floor(baseValue / 2)}%</div></div>
                    <div class="skill-level"><div class="skill-level-title">Ótimo</div>
                        <div class="skill-level-value skill-quarter">${Math.floor(baseValue / 4)}%</div></div>
                </div>
            `;
            skillsList.appendChild(skillDiv);

            // Toggle detalhes
            const skillHeader = skillDiv.querySelector('.skill-header');
            skillHeader.addEventListener('click', function (e) {
                if (e.target.classList.contains('dice-icon') || e.target.closest('.dice-button')) return;
                this.nextElementSibling.classList.toggle('hidden');
            });

            // Rolar dado
            const diceButton = skillDiv.querySelector('.dice-button');
            diceButton.addEventListener('click', function (e) {
                e.stopPropagation();
                const skillName = skillDiv.querySelector('.skill-name').textContent;
                const skillValue = skillDiv.querySelector('.skill-value').textContent;
                handleDiceRoll(skillName, skillValue, diceHistoryArea);
            });
        });
    }

    // Atualização de valores derivados nas perícias dinâmicas
    function updateDynamicSkills() {
        const dex = parseInt(document.getElementById('dex').value) || 0;
        const edu = parseInt(document.getElementById('edu').value) || 0;

        // Esquiva
        document.querySelectorAll('.skill-name').forEach(el => {
            if (el.textContent === 'Esquiva') {
                const dexHalf = Math.floor(dex / 2);
                el.nextElementSibling.textContent = dexHalf + '%';
                const details = el.parentElement.nextElementSibling;
                if (details) {
                    const regularInput = details.querySelector('.skill-regular');
                    if (regularInput && !regularInput.dataset.userModified) {
                        regularInput.value = dexHalf;
                        updateSkillDerived(regularInput);
                    }
                }
            }
        });

        // Língua nativa
        document.querySelectorAll('.skill-name').forEach(el => {
            if (el.textContent === 'Língua Nativa') {
                el.nextElementSibling.textContent = edu + '%';
                const details = el.parentElement.nextElementSibling;
                if (details) {
                    const regularInput = details.querySelector('.skill-regular');
                    if (regularInput && !regularInput.dataset.userModified) {
                        regularInput.value = edu;
                        updateSkillDerived(regularInput);
                    }
                }
            }
        });
    }

    function updateSkillDerived(input) {
        const value = parseInt(input.value) || 0;
        const parent = input.closest('.skill-details');
        if (parent) {
            parent.querySelector('.skill-half').textContent = Math.floor(value / 2) + '%';
            parent.querySelector('.skill-quarter').textContent = Math.floor(value / 4) + '%';
        }
    }

    // =========================
    //   ATUALIZAR FICHA
    // =========================

    // Atualiza atributos derivados/características/fichas/dinâmicas/status bars
    function updateCharacterSheet() {
        const chars = ['str', 'con', 'siz', 'dex', 'app', 'int', 'pow', 'edu'];
        chars.forEach(char => {
            const value = parseInt(document.getElementById(char).value) || 0;
            document.getElementById(`${char}Half`).textContent = Math.floor(value / 2);
            document.getElementById(`${char}Quarter`).textContent = Math.floor(value / 5);
        });

        updateDerivedAttributes();
        updateStatusBars();
        updateDynamicSkills();
    }

    function updateDerivedAttributes() {
        const str = parseInt(document.getElementById('str').value) || 0;
        const con = parseInt(document.getElementById('con').value) || 0;
        const siz = parseInt(document.getElementById('siz').value) || 0;
        const dex = parseInt(document.getElementById('dex').value) || 0;
        const pow = parseInt(document.getElementById('pow').value) || 0;
        const age = parseInt(document.getElementById('age').value) || 0;

        // HP, MP, SAN e MOV
        const maxHP = Math.floor((con + siz) / 10);
        const maxMP = Math.floor(pow / 5);
        const maxSAN = Math.min(99, pow);

        // MOV
        let mov = 8;
        if (dex < siz && str < siz) mov = 7;
        if (dex > siz && str > siz) mov = 9;
        if (age >= 40) {
            if      (age < 50) mov -= 1;
            else if (age < 60) mov -= 2;
            else if (age < 70) mov -= 3;
            else if (age < 80) mov -= 4;
            else               mov -= 5;
        }
        mov = Math.max(1, mov);
        document.getElementById('maxHP').textContent = maxHP;
        document.getElementById('maxMP').textContent = maxMP;
        document.getElementById('movValue').textContent = mov;

        // DB e Build
        const strSiz = str + siz;
        let db = "Nenhum", build = 0;
        if (strSiz >= 2 && strSiz <= 64)        { db = "-2";      build = -2; }
        else if (strSiz >= 65 && strSiz <= 84)  { db = "-1";      build = -1; }
        else if (strSiz >= 85 && strSiz <= 124) { db = "Nenhum";  build = 0; }
        else if (strSiz >= 125 && strSiz <= 164){ db = "+1D4";    build = 1; }
        else if (strSiz >= 165 && strSiz <= 204){ db = "+1D6";    build = 2; }
        else if (strSiz >= 205)                 { db = "+2D6";    build = 3; }
        document.getElementById('dbValue').textContent = db;
        document.getElementById('buildValue').textContent = build;
    }

    // Adiciona botões de dado nas características principais
    function addDiceButtonsToCharacteristics(diceHistoryArea) {
        // IDs dos inputs das características
        const charList = [
            { id: 'str', label: 'FOR' },
            { id: 'con', label: 'CON' },
            { id: 'siz', label: 'TAM' },
            { id: 'dex', label: 'DES' },
            { id: 'app', label: 'APA' },
            { id: 'int', label: 'INT' },
            { id: 'pow', label: 'POD' },
            { id: 'edu', label: 'EDU' }
        ];

        charList.forEach(char => {
            const container = document.getElementById(char.id)?.parentElement;
            if (container && !container.querySelector('.dice-button')) {
                const button = createDiceButton(`Rolar ${char.label}`);
                button.style.marginLeft = '4px';
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const field = document.getElementById(char.id);
                    let value = field.value || field.textContent || 0;
                    handleDiceRoll(char.label, value, diceHistoryArea);
                });
                container.appendChild(button);
            }
        });
    }

    // =========================
    //        EVENTOS
    // =========================

    function setupEventListeners(diceHistoryArea) {
        // Quando características mudam, atualiza ficha
        document.querySelectorAll('input[type="number"]').forEach(input => {
            // Don't add event listeners if we're in read-only mode
            if (!isReadOnlyMode) {
                input.addEventListener('change', updateCharacterSheet);
                input.addEventListener('input', updateCharacterSheet);
            }
        });

        // Atualização dos valores das perícias pelo usuário
        document.addEventListener('change', function (e) {
            if (e.target.classList.contains('skill-regular')) {
                e.target.dataset.userModified = true;
                updateSkillDerived(e.target);
                const skillItem = e.target.closest('.skill-item');
                if (skillItem) {
                    const headerValue = skillItem.querySelector('.skill-value');
                    if (headerValue) headerValue.textContent = e.target.value + '%';
                }
            }
        });

        // Abas
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function () {
                const tabId = this.getAttribute('data-tab');
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                document.getElementById(tabId + '-tab').classList.add('active');
            });
        });

        // Busca de perícia
        document.getElementById('skill-search').addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            document.querySelectorAll('.skill-item').forEach(item => {
                const skillName = item.querySelector('.skill-name').textContent.toLowerCase();
                item.style.display = (searchTerm === '' || skillName.includes(searchTerm)) ? '' : 'none';
            });
        });

        // Adicionar arma
        const addWeaponBtn = document.getElementById('add-weapon');
        if (addWeaponBtn && !isReadOnlyMode) {
            addWeaponBtn.addEventListener('click', function () {
                const weaponGrid = document.querySelector('.weapon-grid');
                const fragment = document.createDocumentFragment();
                ['Nova arma...', '%', 'Dano', 'Alcance'].forEach((placeholder, idx) => {
                    const input = document.createElement('input');
                    input.type = idx === 1 ? 'number' : 'text';
                    input.placeholder = placeholder;
                    fragment.appendChild(input);
                });
                weaponGrid.appendChild(fragment);
            });
        }

        // Adicionar item
        const addItemBtn = document.getElementById('add-item');
        if (addItemBtn && !isReadOnlyMode) {
            addItemBtn.addEventListener('click', function () {
                const itemList = document.querySelector('.item-list');
                const newRow = document.createElement('div');
                newRow.className = 'item-row';
                newRow.innerHTML = `
                    <input type="text" placeholder="Item" style="width: 70%;">
                    <input type="text" placeholder="Quantidade" style="width: 15%;">
                    <input type="text" placeholder="Peso" style="width: 15%;">
                `;
                itemList.appendChild(newRow);
            });
        }
    }

    // =========================
    //        FILTRO
    // =========================

    function setupSkillFilter() {
        const skillFilter = document.getElementById('skill-filter');
        let filterDropdown;
        skillFilter.addEventListener('click', function () {
            if (!filterDropdown) {
                filterDropdown = document.createElement('div');
                filterDropdown.className = 'filter-dropdown';
                filterDropdown.innerHTML = `
                    <div class="filter-option active" data-filter="all">Todas</div>
                    <div class="filter-option" data-filter="combat">Combate</div>
                    <div class="filter-option" data-filter="social">Sociais</div>
                    <div class="filter-option" data-filter="academic">Acadêmicas</div>
                    <div class="filter-option" data-filter="physical">Físicas</div>
                    <div class="filter-option" data-filter="practical">Práticas</div>
                `;
                document.querySelector('.side-column .card').appendChild(filterDropdown);
                filterDropdown.querySelectorAll('.filter-option').forEach(option => {
                    option.addEventListener('click', function () {
                        filterDropdown.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
                        this.classList.add('active');
                        filterSkills(this.getAttribute('data-filter'));
                        filterDropdown.classList.remove('show');
                    });
                });
            }
            filterDropdown.classList.toggle('show');
        });

        document.addEventListener('click', function (e) {
            if (filterDropdown && !e.target.closest('#skill-filter') && !e.target.closest('.filter-dropdown')) {
                filterDropdown.classList.remove('show');
            }
        });
    }

    function filterSkills(filter) {
        document.querySelectorAll('.skill-item').forEach(item => {
            const skillName = item.querySelector('.skill-name').textContent;
            item.style.display =
                filter === 'all' || (skillCategories[filter] && skillCategories[filter].includes(skillName)) ? '' : 'none';
        });
    }

    // =========================
    //     ESTILO / INIT
    // =========================

    function loadDiceStyle() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'dice-styles.css';
        document.head.appendChild(link);
    }

    // =========================
    //          MAIN
    // =========================

    // Valores de características iniciais
    const statValues = {
        dex: parseInt(document.getElementById('dex').value) || 0,
        edu: parseInt(document.getElementById('edu').value) || 0
    };

    const skillsList = document.querySelector('.skills-list');
    createDiceResultModal(); // garante que modal existe para listeners

    // Cria toda lista, histórico e listeners
    skillsList.innerHTML = '';
    const diceHistoryArea = createDiceHistoryArea(skillsList);
    createSkillElements(skillsList, statValues, diceHistoryArea);
    addDiceButtonsToCharacteristics(diceHistoryArea); // Adiciona botões nas características

    setupEditableValues();
    setupArrowButtons();
    setupMagicLock();
    setupOutsideModalClose();
    setupEventListeners(diceHistoryArea);
    setupSkillFilter();
    loadDiceStyle();

    // Inicialização da ficha
    updateCharacterSheet();
    document.querySelector('.tab').click();
});
