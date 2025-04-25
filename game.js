// game.js
document.addEventListener('DOMContentLoaded', () => {
    // Game State
    const state = {
        currencies: {
            shabas: 0,
            igolos: 0,
            blorps: 0
        },
        stats: {
            totalClicks: 0,
            playTime: 0,
            clickPower: 1,
            critChance: 0.05,
            critMultiplier: 2,
            autoClickers: 0,
            autoClickRate: 0,
            prestigeMultiplier: 1
        },
        upgrades: {
            click: [
                { id: 'click-1', name: 'Better Fingers', desc: '+1 Click Power', cost: 10, bought: false, effect: () => { state.stats.clickPower += 1; } },
                { id: 'click-2', name: 'Precision Training', desc: '+5% Crit Chance', cost: 25, bought: false, effect: () => { state.stats.critChance += 0.05; } },
                { id: 'click-3', name: 'Power Gloves', desc: 'x2 Crit Damage', cost: 50, bought: false, effect: () => { state.stats.critMultiplier = 3; } },
                { id: 'click-4', name: 'Hjalte Motivation', desc: '+2 Power per Click', cost: 100, bought: false, effect: () => { state.stats.clickPower += 2; } },
                { id: 'click-5', name: 'Golden Fingers', desc: '15% Chance for 10x Click', cost: 250, bought: false, effect: () => { /* Special handled in click */ } }
            ],
            auto: [
                { id: 'auto-1', name: 'Assistant Poke', desc: '+0.1 Shabas/s', cost: 15, bought: false, effect: () => { state.stats.autoClickRate += 0.1; } },
                { id: 'auto-2', name: 'Poke Machine', desc: '+0.5 Shabas/s', cost: 40, bought: false, effect: () => { state.stats.autoClickRate += 0.5; } },
                { id: 'auto-3', name: 'Poke Factory', desc: '+2 Shabas/s', cost: 100, bought: false, effect: () => { state.stats.autoClickRate += 2; } },
                { id: 'auto-4', name: 'Poke AI', desc: 'x2 Auto Efficiency', cost: 250, bought: false, effect: () => { state.stats.autoClickRate *= 2; } }
            ],
            boost: [
                { id: 'boost-1', name: 'Blorp Fertilizer', desc: 'Farms grow 20% faster', cost: 20, bought: false, effect: () => { farmGrowthTime *= 0.8; } },
                { id: 'boost-2', name: 'Mining Pick', desc: '+1 Mine Depth', cost: 30, bought: false, effect: () => { mineDepth += 1; } },
                { id: 'boost-3', name: 'Stamina Training', desc: '+5 Max Stamina', cost: 50, bought: false, effect: () => { maxStamina += 5; } },
                { id: 'boost-4', name: 'Lucky Charm', desc: 'Better Minigame Rewards', cost: 100, bought: false, effect: () => { mineGemChance += 0.05; } }
            ]
        },
        minigames: {
            farm: {
                plots: Array(5).fill().map(() => ({ planted: false, growth: 0 })),
                growthTime: 30
            },
            mine: {
                depth: 1,
                stamina: 10,
                maxStamina: 10,
                gemChance: 0.1
            }
        },
        hjalteLevel: 1,
        experience: 0,
        nextLevel: 100,
        events: [],
        lastUpdate: Date.now()
    };

    // DOM Elements
    const elements = {
        // Currencies
        shabas: document.getElementById('shabas'),
        igolos: document.getElementById('igolos'),
        blorps: document.getElementById('blorps'),
        shabaIncome: document.getElementById('shaba-income'),
        
        // Stats
        playTime: document.getElementById('play-time'),
        totalClicks: document.getElementById('total-clicks'),
        clickPower: document.getElementById('click-power'),
        critChance: document.getElementById('crit-chance'),
        hjalteLevel: document.getElementById('hjalte-level'),
        
        // Prestige
        prestigeMult: document.getElementById('prestige-mult'),
        nextPrestige: document.getElementById('next-prestige'),
        prestigeBtn: document.getElementById('prestige-btn'),
        
        // Clicker
        clickTarget: document.getElementById('click-target'),
        
        // Upgrades
        clickUpgrades: document.getElementById('click-upgrades'),
        autoUpgrades: document.getElementById('auto-upgrades'),
        boostUpgrades: document.getElementById('boost-upgrades'),
        tabBtns: document.querySelectorAll('.tab-btn'),
        
        // Minigames
        farmGrid: document.querySelector('.farm-grid'),
        plantBtn: document.getElementById('plant-btn'),
        harvestBtn: document.getElementById('harvest-btn'),
        mineGrid: document.querySelector('.mine-grid'),
        mineDepth: document.getElementById('mine-depth'),
        mineStamina: document.getElementById('mine-stamina'),
        mineBtn: document.getElementById('mine-btn'),
        
        // Event Log
        eventLog: document.getElementById('event-log')
    };

    // Game Variables
    let farmGrowthTime = state.minigames.farm.growthTime;
    let mineDepth = state.minigames.mine.depth;
    let maxStamina = state.minigames.mine.maxStamina;
    let mineGemChance = state.minigames.mine.gemChance;
    let gameInterval;
    let farmInterval;
    let mineCells = [];

    // Initialize the game
    function init() {
        loadGame();
        setupEventListeners();
        render();
        startGameLoop();
        initFarm();
        initMine();
        addEvent("Game loaded! Start clicking Hjalte!");
    }

    // Set up event listeners
    function setupEventListeners() {
        // Main clicker
        elements.clickTarget.addEventListener('click', handleClick);
        
        // Prestige
        elements.prestigeBtn.addEventListener('click', performPrestige);
        
        // Tabs
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
        
        // Farm minigame
        elements.plantBtn.addEventListener('click', plantFarm);
        elements.harvestBtn.addEventListener('click', harvestFarm);
        
        // Mine minigame
        elements.mineBtn.addEventListener('click', digMine);
    }

    // Start game loops
    function startGameLoop() {
        clearInterval(gameInterval);
        gameInterval = setInterval(updateGame, 1000);
    }

    // Main game update
    function updateGame() {
        // Update play time
        state.stats.playTime++;
        updatePlayTime();
        
        // Auto clicker income
        if (state.stats.autoClickRate > 0) {
            const income = state.stats.autoClickRate * state.stats.prestigeMultiplier;
            state.currencies.shabas += income;
            addEvent(`Auto-poke earned ${income.toFixed(1)} Shabas!`);
            renderCurrencies();
        }
        
        // Farm growth
        updateFarm();
        
        // Mine stamina recovery
        if (state.minigames.mine.stamina < maxStamina) {
            state.minigames.mine.stamina += 0.5;
            if (state.minigames.mine.stamina > maxStamina) {
                state.minigames.mine.stamina = maxStamina;
            }
            renderMine();
        }
        
        // Save game every minute
        if (state.stats.playTime % 60 === 0) {
            saveGame();
        }
    }

    // Handle click event
    function handleClick() {
        state.stats.totalClicks++;
        
        // Calculate click value
        let clickValue = state.stats.clickPower * state.stats.prestigeMultiplier;
        let isCrit = Math.random() < state.stats.critChance;
        
        // Check for golden fingers (15% chance for 10x)
        const goldenFingers = state.upgrades.click.find(u => u.id === 'click-5' && u.bought);
        if (goldenFingers && Math.random() < 0.15) {
            clickValue *= 10;
            isCrit = true;
            addEvent("GOLDEN FINGERS! 10x Click!");
        }
        // Normal crit
        else if (isCrit) {
            clickValue *= state.stats.critMultiplier;
            addEvent("Critical click!");
        }
        
        // Apply click
        state.currencies.shabas += clickValue;
        
        // Add experience
        gainExperience(clickValue);
        
        // Visual feedback
        createClickFeedback(clickValue, isCrit);
        
        // Render updates
        render();
    }

    // Create visual click feedback
    function createClickFeedback(value, isCrit) {
        const feedback = document.createElement('div');
        feedback.className = 'click-feedback';
        feedback.textContent = `+${Math.floor(value)}`;
        
        if (isCrit) {
            feedback.style.color = '#ffd700';
            feedback.style.fontSize = '1.8rem';
            feedback.style.textShadow = '0 0 5px #ff8c00';
        }
        
        feedback.style.left = `${50 + (Math.random() * 20 - 10)}%`;
        feedback.style.top = `${50 + (Math.random() * 20 - 10)}%`;
        
        elements.clickTarget.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 1000);
    }

    // Experience and level system
    function gainExperience(amount) {
        state.experience += amount;
        
        // Check for level up
        while (state.experience >= state.nextLevel) {
            state.experience -= state.nextLevel;
            state.hjalteLevel++;
            state.nextLevel = Math.floor(state.nextLevel * 1.5);
            
            // Level up benefits
            state.stats.clickPower += 1;
            if (state.hjalteLevel % 5 === 0) {
                state.stats.critChance += 0.01;
            }
            
            addEvent(`Hjalte leveled up to ${state.hjalteLevel}!`);
        }
    }

    // Upgrade functions
    function buyUpgrade(category, index) {
        const upgrade = state.upgrades[category][index];
        
        if (!upgrade.bought && state.currencies.shabas >= upgrade.cost) {
            state.currencies.shabas -= upgrade.cost;
            upgrade.bought = true;
            upgrade.effect();
            
            addEvent(`Purchased upgrade: ${upgrade.name}`);
            render();
        }
    }

    // Tab switching
    function switchTab(tab) {
        document.querySelectorAll('.upgrades-list').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(`${tab}-upgrades`).classList.remove('hidden');
        document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
    }

    // Prestige system
    function performPrestige() {
        if (state.currencies.shabas >= getNextPrestigeRequirement()) {
            const earnedIgolos = calculateIgolosGain();
            
            state.currencies.igolos += earnedIgolos;
            state.stats.prestigeMultiplier = 1 + (state.currencies.igolos * 0.05);
            
            addEvent(`Ascended! Gained ${earnedIgolos} Igolos!`);
            
            // Reset progress but keep some things
            state.currencies.shabas = 0;
            state.currencies.blorps = 0;
            state.stats.clickPower = 1;
            state.stats.autoClickers = 0;
            state.stats.autoClickRate = 0;
            state.stats.totalClicks = 0;
            state.hjalteLevel = 1;
            state.experience = 0;
            state.nextLevel = 100;
            
            // Reset upgrades
            Object.values(state.upgrades).forEach(category => {
                category.forEach(upgrade => upgrade.bought = false);
            });
            
            render();
            saveGame();
        }
    }

    function getNextPrestigeRequirement() {
        return 1000 * Math.pow(1.5, state.currencies.igolos);
    }

    function calculateIgolosGain() {
        return Math.floor(Math.sqrt(state.currencies.shabas / 100));
    }

    // Farm minigame
    function initFarm() {
        elements.farmGrid.innerHTML = '';
        state.minigames.farm.plots.forEach((plot, i) => {
            const plotEl = document.createElement('div');
            plotEl.className = 'farm-plot';
            plotEl.dataset.index = i;
            plotEl.textContent = plot.planted ? '🌱' : '🟫';
            elements.farmGrid.appendChild(plotEl);
        });
    }

    function plantFarm() {
        if (state.currencies.blorps >= 5) {
            const emptyPlots = state.minigames.farm.plots.filter(p => !p.planted);
            
            if (emptyPlots.length > 0) {
                state.currencies.blorps -= 5;
                
                const plotIndex = state.minigames.farm.plots.findIndex(p => !p.planted);
                state.minigames.farm.plots[plotIndex] = {
                    planted: true,
                    growth: 0
                };
                
                updateFarmDisplay();
                elements.plantBtn.textContent = `Plant (5 Blorps) - ${emptyPlots.length - 1} left`;
                
                if (emptyPlots.length === 1) {
                    elements.plantBtn.disabled = true;
                }
                
                elements.harvestBtn.disabled = true;
                renderCurrencies();
            }
        }
    }

    function harvestFarm() {
        let harvested = 0;
        
        state.minigames.farm.plots.forEach((plot, i) => {
            if (plot.planted && plot.growth >= farmGrowthTime) {
                harvested++;
                state.minigames.farm.plots[i] = { planted: false, growth: 0 };
                
                // Random chance for bonus
                const bonus = Math.random() < 0.2 ? 2 : 1;
                state.currencies.blorps += bonus;
            }
        });
        
        if (harvested > 0) {
            addEvent(`Harvested ${harvested} Blorp${harvested > 1 ? 's' : ''}!`);
            updateFarmDisplay();
            renderCurrencies();
        }
        
        // Update buttons
        const emptyPlots = state.minigames.farm.plots.filter(p => !p.planted).length;
        elements.plantBtn.disabled = emptyPlots === 0 || state.currencies.blorps < 5;
        elements.plantBtn.textContent = `Plant (5 Blorps) - ${emptyPlots} left`;
        elements.harvestBtn.disabled = true;
    }

    function updateFarm() {
        let readyToHarvest = false;
        
        state.minigames.farm.plots.forEach((plot, i) => {
            if (plot.planted) {
                state.minigames.farm.plots[i].growth++;
                
                if (plot.growth >= farmGrowthTime) {
                    readyToHarvest = true;
                }
            }
        });
        
        if (readyToHarvest) {
            elements.harvestBtn.disabled = false;
        }
        
        updateFarmDisplay();
    }

    function updateFarmDisplay() {
        state.minigames.farm.plots.forEach((plot, i) => {
            const plotEl = elements.farmGrid.children[i];
            
            if (plot.planted) {
                const growthPercent = (plot.growth / farmGrowthTime) * 100;
                
                if (growthPercent < 25) {
                    plotEl.textContent = '🌱';
                    plotEl.style.background = '#3a5a3a';
                } else if (growthPercent < 50) {
                    plotEl.textContent = '🌿';
                    plotEl.style.background = '#4a7a4a';
                } else if (growthPercent < 75) {
                    plotEl.textContent = '🌾';
                    plotEl.style.background = '#5a9a5a';
                } else if (growthPercent < 100) {
                    plotEl.textContent = '🌻';
                    plotEl.style.background = '#6aba6a';
                } else {
                    plotEl.textContent = '🍄';
                    plotEl.style.background = '#7ada7a';
                    plotEl.classList.add('grown');
                }
            } else {
                plotEl.textContent = '🟫';
                plotEl.style.background = '#2a2a4a';
                plotEl.classList.remove('grown');
            }
        });
    }

    // Mine minigame
    function initMine() {
        generateMine();
    }

    function generateMine() {
        elements.mineGrid.innerHTML = '';
        mineCells = [];
        
        const cellCount = 5 + mineDepth;
        const rockCount = Math.floor(cellCount * 0.7);
        const gemCount = Math.floor(cellCount * mineGemChance);
        
        // Create empty cells
        for (let i = 0; i < cellCount; i++) {
            mineCells.push({ type: 'empty', revealed: false });
        }
        
        // Add rocks
        for (let i = 0; i < rockCount; i++) {
            let index;
            do {
                index = Math.floor(Math.random() * cellCount);
            } while (mineCells[index].type !== 'empty');
            
            mineCells[index].type = 'rock';
        }
        
        // Add gems
        for (let i = 0; i < gemCount; i++) {
            let index;
            do {
                index = Math.floor(Math.random() * cellCount);
            } while (mineCells[index].type !== 'empty');
            
            mineCells[index].type = 'gem';
        }
        
        // Add gold (guaranteed at least 1 if no gems)
        if (gemCount === 0) {
            let index;
            do {
                index = Math.floor(Math.random() * cellCount);
            } while (mineCells[index].type !== 'empty');
            
            mineCells[index].type = 'gold';
        } else {
            // Chance for gold
            if (Math.random() < 0.3) {
                let index;
                do {
                    index = Math.floor(Math.random() * cellCount);
                } while (mineCells[index].type !== 'empty');
                
                mineCells[index].type = 'gold';
            }
        }
        
        // Render cells
        mineCells.forEach((cell, i) => {
            const cellEl = document.createElement('div');
            cellEl.className = 'mine-cell';
            cellEl.dataset.index = i;
            
            if (cell.revealed) {
                cellEl.classList.add(cell.type);
                cellEl.textContent = 
                    cell.type === 'rock' ? '🪨' :
                    cell.type === 'gem' ? '💎' :
                    cell.type === 'gold' ? '🪙' : '⬜';
            } else {
                cellEl.textContent = '❓';
            }
            
            elements.mineGrid.appendChild(cellEl);
        });
    }

    function digMine() {
        if (state.minigames.mine.stamina >= 1) {
            state.minigames.mine.stamina -= 1;
            
            // Find first unrevealed cell
            const cellIndex = mineCells.findIndex(c => !c.revealed);
            
            if (cellIndex !== -1) {
                mineCells[cellIndex].revealed = true;
                const cell = mineCells[cellIndex];
                
                // Update display
                const cellEl = elements.mineGrid.children[cellIndex];
                cellEl.classList.add(cell.type);
                cellEl.textContent = 
                    cell.type === 'rock' ? '🪨' :
                    cell.type === 'gem' ? '💎' :
                    cell.type === 'gold' ? '🪙' : '⬜';
                
                // Handle rewards
                if (cell.type === 'gem') {
                    state.currencies.blorps += 5 + mineDepth;
                    addEvent(`Found a gem! +${5 + mineDepth} Blorps!`);
                } else if (cell.type === 'gold') {
                    state.currencies.shabas += 10 * mineDepth * state.stats.prestigeMultiplier;
                    addEvent(`Found gold! +${10 * mineDepth} Shabas!`);
                }
                
                // Check if all revealed
                if (mineCells.every(c => c.revealed)) {
                    addEvent("Mine exhausted! Generating new mine...");
                    setTimeout(() => {
                        state.minigames.mine.depth = mineDepth;
                        generateMine();
                    }, 1000);
                }
                
                renderCurrencies();
                renderMine();
            }
        }
    }

    function renderMine() {
        elements.mineDepth.textContent = mineDepth;
        elements.mineStamina.textContent = `${Math.floor(state.minigames.mine.stamina)}/${maxStamina}`;
        elements.mineBtn.disabled = state.minigames.mine.stamina < 1;
    }

    // Event log
    function addEvent(message) {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        state.events.unshift(`[${timeString}] ${message}`);
        
        if (state.events.length > 20) {
            state.events.pop();
        }
        
        renderEvents();
    }

    // Rendering functions
    function render() {
        renderCurrencies();
        renderStats();
        renderUpgrades();
        renderPrestige();
    }

    function renderCurrencies() {
        elements.shabas.textContent = Math.floor(state.currencies.shabas);
        elements.igolos.textContent = state.currencies.igolos;
        elements.blorps.textContent = state.currencies.blorps;
        elements.shabaIncome.textContent = `+${(state.stats.autoClickRate * state.stats.prestigeMultiplier).toFixed(1)}/s`;
    }

    function renderStats() {
        elements.totalClicks.textContent = state.stats.totalClicks;
        elements.clickPower.textContent = state.stats.clickPower;
        elements.critChance.textContent = `${Math.floor(state.stats.critChance * 100)}%`;
        elements.hjalteLevel.textContent = state.hjalteLevel;
    }

    function renderUpgrades() {
        // Click upgrades
        elements.clickUpgrades.innerHTML = state.upgrades.click.map((upgrade, i) => `
            <div class="upgrade-item ${upgrade.bought ? 'bought' : ''}">
                <div class="upgrade-info">
                    <div class="upgrade-name">${upgrade.name}</div>
                    <div class="upgrade-desc">${upgrade.desc}</div>
                </div>
                <div class="upgrade-cost">${upgrade.cost}</div>
                <button class="upgrade-btn" 
                    onclick="buyUpgrade('click', ${i})"
                    ${upgrade.bought || state.currencies.shabas < upgrade.cost ? 'disabled' : ''}>
                    ${upgrade.bought ? 'Bought' : 'Buy'}
                </button>
            </div>
        `).join('');
        
        // Auto upgrades
        elements.autoUpgrades.innerHTML = state.upgrades.auto.map((upgrade, i) => `
            <div class="upgrade-item ${upgrade.bought ? 'bought' : ''}">
                <div class="upgrade-info">
                    <div class="upgrade-name">${upgrade.name}</div>
                    <div class="upgrade-desc">${upgrade.desc}</div>
                </div>
                <div class="upgrade-cost">${upgrade.cost}</div>
                <button class="upgrade-btn" 
                    onclick="buyUpgrade('auto', ${i})"
                    ${upgrade.bought || state.currencies.shabas < upgrade.cost ? 'disabled' : ''}>
                    ${upgrade.bought ? 'Bought' : 'Buy'}
                </button>
            </div>
        `).join('');
        
        // Boost upgrades
        elements.boostUpgrades.innerHTML = state.upgrades.boost.map((upgrade, i) => `
            <div class="upgrade-item ${upgrade.bought ? 'bought' : ''}">
                <div class="upgrade-info">
                    <div class="upgrade-name">${upgrade.name}</div>
                    <div class="upgrade-desc">${upgrade.desc}</div>
                </div>
                <div class="upgrade-cost">${upgrade.cost}</div>
                <button class="upgrade-btn" 
                    onclick="buyUpgrade('boost', ${i})"
                    ${upgrade.bought || state.currencies.shabas < upgrade.cost ? 'disabled' : ''}>
                    ${upgrade.bought ? 'Bought' : 'Buy'}
                </button>
            </div>
        `).join('');
    }

    function renderPrestige() {
        elements.prestigeMult.textContent = `${state.stats.prestigeMultiplier.toFixed(1)}x`;
        elements.nextPrestige.textContent = Math.floor(getNextPrestigeRequirement()).toLocaleString();
        elements.prestigeBtn.disabled = state.currencies.shabas < getNextPrestigeRequirement();
    }

    function renderEvents() {
        elements.eventLog.innerHTML = state.events.map(event => `
            <div class="event-entry">${event}</div>
        `).join('');
    }

    function updatePlayTime() {
        const hours = Math.floor(state.stats.playTime / 3600);
        const minutes = Math.floor((state.stats.playTime % 3600) / 60);
        const seconds = state.stats.playTime % 60;
        
        elements.playTime.textContent = 
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`;
    }

    // Save/load system
    function saveGame() {
        const saveData = {
            currencies: state.currencies,
            stats: state.stats,
            upgrades: state.upgrades,
            minigames: state.minigames,
            hjalteLevel: state.hjalteLevel,
            experience: state.experience,
            nextLevel: state.nextLevel,
            events: state.events,
            lastUpdate: Date.now()
        };
        
        localStorage.setItem('hjalteClickerSave', JSON.stringify(saveData));
    }

    function loadGame() {
        const saveData = localStorage.getItem('hjalteClickerSave');
        
        if (saveData) {
            try {
                const parsed = JSON.parse(saveData);
                
                // Load simple properties
                state.currencies = parsed.currencies || state.currencies;
                state.stats = parsed.stats || state.stats;
                state.hjalteLevel = parsed.hjalteLevel || state.hjalteLevel;
                state.experience = parsed.experience || state.experience;
                state.nextLevel = parsed.nextLevel || state.nextLevel;
                state.events = parsed.events || state.events;
                
                // Load upgrades (need to preserve function references)
                if (parsed.upgrades) {
                    Object.keys(parsed.upgrades).forEach(category => {
                        parsed.upgrades[category].forEach((savedUpgrade, i) => {
                            if (state.upgrades[category][i]) {
                                state.upgrades[category][i].bought = savedUpgrade.bought;
                            }
                        });
                    });
                }
                
                // Load minigames
                if (parsed.minigames) {
                    state.minigames.farm = parsed.minigames.farm || state.minigames.farm;
                    state.minigames.mine = parsed.minigames.mine || state.minigames.mine;
                }
                
                // Calculate offline progress
                if (parsed.lastUpdate) {
                    const offlineSeconds = Math.floor((Date.now() - parsed.lastUpdate) / 1000);
                    if (offlineSeconds > 0 && offlineSeconds < 86400) { // Max 1 day
                        const offlineIncome = state.stats.autoClickRate * state.stats.prestigeMultiplier * offlineSeconds;
                        if (offlineIncome > 0) {
                            state.currencies.shabas += offlineIncome;
                            addEvent(`Welcome back! You earned ${Math.floor(offlineIncome)} Shabas while away!`);
                        }
                    }
                }
                
                addEvent("Game loaded successfully!");
            } catch (e) {
                console.error("Failed to load save:", e);
                addEvent("New game started!");
            }
        }
    }

    // Make buyUpgrade available globally
    window.buyUpgrade = buyUpgrade;

    // Start the game
    init();
});