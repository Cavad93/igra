// ══════════════════════════════════════════════════════════════════════
// GOVERNMENT TAB — адаптивный оверлей форм правления
// Рендерится динамически из объекта government.
// Не падает на нестандартных структурах — если поля нет, блок не рендерится.
// ══════════════════════════════════════════════════════════════════════

function showGovernmentOverlay() {
  const overlay = document.getElementById('gov-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  renderGovernmentOverlay();
}

function hideGovernmentOverlay() {
  const overlay = document.getElementById('gov-overlay');
  if (overlay) overlay.style.display = 'none';
}

function renderGovernmentOverlay() {
  const container = document.getElementById('gov-content');
  if (!container) return;
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  if (!nation) return;
  container.innerHTML = renderGovernmentTab(nation);
}

// ──────────────────────────────────────────────────────────────────────
// ГЛАВНЫЙ РЕНДЕР — генерируется из объекта government
// ──────────────────────────────────────────────────────────────────────

function renderGovernmentTab(nation) {
  const gov = nation.government;
  if (!gov) return '<div class="gov-empty">Нет данных о правительстве.</div>';

  const sections = [];

  // 1. Заголовок с типом правления и ключевыми метриками
  sections.push(renderGovHeader(gov));

  // 2. Баннер активного перехода (приоритет — показывается первым)
  if (gov.active_transition?.status === 'in_progress') {
    sections.push(renderTransitionBanner(gov.active_transition));
  }

  // 3. Правящий актор
  if (gov.ruler) {
    sections.push(renderRulerBlock(gov.ruler, nation));
  }

  // 3.5. Зал власти (адаптируется к типу правления)
  sections.push(renderGovernmentHall(gov, nation));

  // 4. Ресурс власти
  if (gov.power_resource) {
    sections.push(renderPowerResourceBlock(gov.power_resource, gov));
  }

  // 5. Институты — каждый адаптирован под свой type
  if (gov.institutions?.length) {
    sections.push(`<div class="gov-section-title">🏛 Институты власти</div>`);
    sections.push(gov.institutions.map(inst => renderInstitutionBlock(inst, nation)).join(''));
  }

  // 5.5. Сенат (Lazy Materialization) — если инициализирован
  const senateBlock = renderSenateLazyBlock(GAME_STATE.player_nation);
  if (senateBlock) sections.push(senateBlock);

  // 5.6. Конституционный строй (если есть state_architecture)
  const arch = nation.senate_config?.state_architecture;
  if (arch) sections.push(renderConstitutionBlock(arch, nation));

  // 6. Активные механики (только включённые)
  if (gov.elections?.enabled) {
    sections.push(renderElectionBlock(gov.elections));
  }
  if (gov.succession?.tracked) {
    sections.push(renderSuccessionBlock(gov.succession, nation));
  }
  if (gov.conspiracies) {
    sections.push(renderConspiracyBlock(gov.conspiracies, nation));
  }

  // 7. Кастомные механики
  if (gov.custom_mechanics?.length) {
    sections.push(renderCustomMechanicsBlock(gov.custom_mechanics));
  }

  // 8. История переходов (компактно)
  if (gov.transition_history?.length) {
    sections.push(renderTransitionHistory(gov.transition_history));
  }

  // 9. Поле реформы правительства
  sections.push(renderReformInput());

  return sections.filter(Boolean).join('');
}

// ──────────────────────────────────────────────────────────────────────
// 1. ЗАГОЛОВОК
// ──────────────────────────────────────────────────────────────────────

function renderGovHeader(gov) {
  const typeName = getGovernmentNameFull(gov.type, gov.custom_name);
  const legColor = gov.legitimacy > 60 ? '#4CAF50' : gov.legitimacy > 30 ? '#FF9800' : '#f44336';
  const stabColor = (gov.stability ?? 50) > 60 ? '#4CAF50'
                  : (gov.stability ?? 50) > 30 ? '#FF9800' : '#f44336';

  return `
    <div class="gov-header">
      <div class="gov-type-badge">${getGovTypeIcon(gov.type)} ${typeName}</div>
      <div class="gov-metrics">
        <div class="gov-metric">
          <span class="gov-metric-label">Легитимность</span>
          <div class="bar-container"><div class="bar-fill" style="width:${gov.legitimacy}%;background:${legColor}"></div></div>
          <span class="gov-metric-val" style="color:${legColor}">${gov.legitimacy}%</span>
        </div>
        <div class="gov-metric">
          <span class="gov-metric-label">Стабильность</span>
          <div class="bar-container"><div class="bar-fill" style="width:${gov.stability ?? 50}%;background:${stabColor}"></div></div>
          <span class="gov-metric-val" style="color:${stabColor}">${gov.stability ?? 50}%</span>
        </div>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────────────
// 2. БАННЕР ПЕРЕХОДА
// ──────────────────────────────────────────────────────────────────────

function renderTransitionBanner(trans) {
  const from = getGovernmentNameFull(trans.from);
  const to   = getGovernmentNameFull(trans.to);
  return `
    <div class="gov-transition-banner">
      <div class="transition-title">🔄 Переходный период</div>
      <div class="transition-route">${from} → ${to}</div>
      <div class="transition-meta">
        Ход ${trans.turns_elapsed ?? 0} из ~10 · Причина: ${trans.cause}
      </div>
      <div class="transition-warning">⚠️ Активны штрафы к стабильности и лояльности армии</div>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────────────
// 3. ПРАВЯЩИЙ АКТОР
// ──────────────────────────────────────────────────────────────────────

function renderRulerBlock(ruler, nation) {
  if (!ruler) return '';

  if (ruler.type === 'person') {
    return renderPersonRuler(ruler, nation);
  } else if (ruler.type === 'council') {
    return renderCouncilRuler(ruler, nation);
  } else if (ruler.type === 'deity_proxy') {
    return renderDeityProxyRuler(ruler, nation);
  }

  // Fallback — неизвестный тип правителя
  return `<div class="gov-section"><div class="gov-section-title">👑 Правитель</div><div class="gov-text">${ruler.name ?? '?'}</div></div>`;
}

function renderPersonRuler(ruler, nation) {
  const char = (nation.characters ?? []).find(c => ruler.character_ids?.includes(c.id));
  const powerColor = ruler.personal_power > 70 ? '#f44336'
                   : ruler.personal_power > 40 ? '#FF9800' : '#4CAF50';

  return `
    <div class="gov-section">
      <div class="gov-section-title">👑 Правитель</div>
      <div class="gov-ruler-card">
        <div class="gov-ruler-portrait">${char?.portrait ?? '👤'}</div>
        <div class="gov-ruler-info">
          <div class="gov-ruler-name">${ruler.name}</div>
          ${char ? `<div class="gov-ruler-role">${getRoleLabel(char.role)} · ${char.age} лет · ❤️ ${char.health}/100</div>` : ''}
          <div class="gov-metric small" title="Личная власть: концентрация воли правителя.&#10;&#10;Влияет на:&#10;• Голосования: ≥70 → +10% поддержки сенаторов; ≤25 → −8%&#10;• Заговоры: ≥75 → риск ×0.5; ≤25 → риск ×1.8&#10;• Легитимность: ≥70 → +0.3/ход; ≤25 → −0.5/ход&#10;• Стабильность: ≤20 → −1/ход&#10;&#10;Рассчитывается из: тип правления + легитимность + ресурс власти&#10;+ поддержка армии + доминирование фракции − штраф за заговоры">
            <span class="gov-metric-label">Личная власть</span>
            <div class="bar-container"><div class="bar-fill" style="width:${ruler.personal_power ?? 50}%;background:${powerColor}"></div></div>
            <span class="gov-metric-val">${ruler.personal_power ?? 50}</span>
          </div>
        </div>
        ${char ? `<button class="gov-char-link" onclick="showCharacterDetail('${char.id}');hideGovernmentOverlay()">📋 Досье</button>` : ''}
      </div>
    </div>
  `;
}

function renderCouncilRuler(ruler, nation) {
  // Ищем nationId по объекту нации, чтобы получить реальное число сенаторов
  const nationId    = Object.keys(GAME_STATE.nations).find(k => GAME_STATE.nations[k] === nation);
  const senateMgr   = nationId ? getSenateManager(nationId) : null;
  const _govInsts   = nation?.government?.institutions ?? [];
  const _factionInst = _govInsts.find(i => i.factions?.some(f => f.seats));
  const memberCount = _factionInst
    ? _factionInst.factions.reduce((s, f) => s + (f.seats ?? 0), 0)
    : (senateMgr ? senateMgr.senators.length : (ruler.character_ids?.length || null));

  const memberStr = memberCount != null ? memberCount : 'неизвестно';

  return `
    <div class="gov-section">
      <div class="gov-section-title">🏛 Правящий орган</div>
      <div class="gov-council-card">
        <div class="gov-council-name">${ruler.name}</div>
        <div class="gov-council-meta">
          Членов: ${memberStr} ·
          <span title="Личная власть: концентрация воли главы совета.&#10;&#10;Влияет на:&#10;• Голосования: ≥70 → +10% поддержки; ≤25 → −8%&#10;• Заговоры: ≥75 → риск ×0.5; ≤25 → риск ×1.8&#10;• Легитимность и стабильность при крайних значениях&#10;&#10;Рассчитывается автоматически каждый ход">Личная власть главы совета: ${ruler.personal_power ?? 20}/100</span>
        </div>
        <div class="gov-council-note">⚖️ Решения принимаются коллегиально</div>
      </div>
    </div>
  `;
}

function renderDeityProxyRuler(ruler, nation) {
  const priest = (nation.characters ?? []).find(c => ruler.character_ids?.includes(c.id));
  return `
    <div class="gov-section">
      <div class="gov-section-title">🕊️ Власть богов</div>
      <div class="gov-deity-card">
        <div class="gov-deity-title">${ruler.name}</div>
        ${priest
          ? `<div class="gov-deity-proxy">Воплощён через: ${priest.portrait ?? '👤'} <strong>${priest.name}</strong></div>`
          : '<div class="gov-deity-proxy">Верховный жрец ещё не назначен</div>'
        }
        <div class="gov-deity-note">Все решения освящаются именем богов</div>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────────────
// 4. РЕСУРС ВЛАСТИ
// ──────────────────────────────────────────────────────────────────────

function renderPowerResourceBlock(pr, gov) {
  const name  = getPowerResourceName(pr.type);
  const color = getPowerResourceColor(pr.type);
  const val   = Math.round(pr.current ?? 0);
  const icon  = getPowerResourceIcon(pr.type);

  const restoredList = (pr.restored_by ?? [])
    .map(r => `<span class="gov-tag">${formatWant(r)}</span>`).join('');

  const warningText = getResourceWarning(pr.type, val, gov);

  return `
    <div class="gov-section">
      <div class="gov-section-title">${icon} Ресурс власти: ${name}</div>
      <div class="gov-power-bar-row">
        <div class="bar-container wide">
          <div class="bar-fill" style="width:${val}%;background:${color}"></div>
        </div>
        <span class="gov-power-val" style="color:${color}">${val}/100</span>
      </div>
      <div class="gov-power-decay">
        Распад: −${pr.decay_per_turn ?? 0.5}/ход
      </div>
      ${restoredList ? `<div class="gov-power-restore">Восстанавливают: ${restoredList}</div>` : ''}
      ${warningText ? `<div class="gov-power-warning">${warningText}</div>` : ''}
    </div>
  `;
}

function getResourceWarning(type, val, gov) {
  if (type === 'fear' && val < 30) return '⚠️ Страх ослаб. Заговорщики осмелели.';
  if (type === 'legitimacy' && val < 25) return '🔴 Легитимность критически мала. Государство под угрозой.';
  if (type === 'prestige' && val < 20) return '⚠️ Потеря престижа. Воины сомневаются в вожде.';
  if (type === 'divine_mandate' && val < 30) return '⚠️ Боги отвернулись. Народ ропщет.';
  if (gov.type === 'tyranny' && val > 80) return '💪 Страх на пике. Никто не смеет возражать.';
  return null;
}

// ──────────────────────────────────────────────────────────────────────
// 5. ИНСТИТУТЫ
// ──────────────────────────────────────────────────────────────────────

function renderInstitutionBlock(inst, nation) {
  // Пропускаем незаполненные объекты (могут прийти из AI-дельты без имени)
  if (!inst || !inst.name) return '';

  const typeLabel = getInstTypeLabel(inst.type);
  const methodLabel = getDecisionMethodLabel(inst.decision_method);

  // Фракции не показываем — они визуализируются в Зале Сената/Совета
  const powersHtml = inst.powers?.length
    ? `<div class="gov-inst-powers">${inst.powers.map(p => `<span class="gov-tag green">${formatWant(p)}</span>`).join('')}</div>`
    : '';

  const limitsHtml = inst.limitations?.length
    ? `<div class="gov-inst-limits">${inst.limitations.map(l => `<span class="gov-tag red">${formatWant(l)}</span>`).join('')}</div>`
    : '';

  return `
    <div class="gov-institution">
      <div class="gov-inst-header">
        <span class="gov-inst-name">${inst.name ?? '?'}</span>
        ${typeLabel ? `<span class="gov-inst-type">${typeLabel}</span>` : ''}
        ${inst.size ? `<span class="gov-inst-size">${inst.size} чел.</span>` : ''}
      </div>
      <div class="gov-inst-method">⚖️ ${methodLabel ?? inst.decision_method ?? '—'}${inst.quorum ? ` · Кворум: ${inst.quorum}%` : ''}</div>
      ${powersHtml}
      ${limitsHtml}
    </div>
  `;
}

function renderFactionList(factions) {
  const total = factions.reduce((s, f) => s + (f.seats ?? 0), 0);

  const bars = factions.map((f, i) => {
    const pct = total > 0 ? Math.round(f.seats / total * 100) : 0;
    const color = FACTION_COLORS[i % FACTION_COLORS.length];
    return `<div class="faction-bar-seg" style="width:${pct}%;background:${color}" title="${f.name}: ${f.seats} мест (${pct}%)"></div>`;
  }).join('');

  const labels = factions.map((f, i) => {
    const color = FACTION_COLORS[i % FACTION_COLORS.length];
    const wantsStr = (f.wants ?? []).slice(0, 2).map(w => formatWant(w)).join(', ');
    return `
      <div class="faction-item">
        <span class="faction-dot" style="background:${color}"></span>
        <span class="faction-name">${f.name}</span>
        <span class="faction-seats">${f.seats} мест</span>
        ${wantsStr ? `<span class="faction-wants" title="Хотят: ${wantsStr}">💬 ${wantsStr}</span>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="gov-factions">
      <div class="faction-bar">${bars}</div>
      <div class="faction-legend">${labels}</div>
    </div>
  `;
}

const FACTION_COLORS = ['#8B4513', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#f44336'];

// ──────────────────────────────────────────────────────────────────────
// 6. ВЫБОРЫ
// ──────────────────────────────────────────────────────────────────────

function renderElectionBlock(elections) {
  const urgency = elections.next_election <= 2 ? 'danger'
                : elections.next_election <= 5 ? 'warning' : 'info';
  const urgencyColor = urgency === 'danger' ? '#f44336' : urgency === 'warning' ? '#FF9800' : '#4CAF50';

  return `
    <div class="gov-section">
      <div class="gov-section-title">🗳️ Выборы</div>
      <div class="gov-election-row">
        <span class="gov-election-label">До следующих выборов:</span>
        <span class="gov-election-count" style="color:${urgencyColor}">
          ${elections.next_election} ход(а)
        </span>
      </div>
      <div class="gov-election-meta">
        Голосуют: ${formatVoters(elections.eligible_voters)} ·
        Периодичность: ${elections.frequency_turns ?? '?'} ходов
      </div>
      ${elections.offices?.length
        ? `<div class="gov-election-offices">Должности: ${elections.offices.map(o => `<span class="gov-tag">${o}</span>`).join('')}</div>`
        : ''}
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────────────
// 7. ПРЕЕМСТВЕННОСТЬ
// ──────────────────────────────────────────────────────────────────────

function renderSuccessionBlock(succession, nation) {
  const heir = succession.heir
    ? (nation.characters ?? []).find(c => c.id === succession.heir)
    : null;

  return `
    <div class="gov-section">
      <div class="gov-section-title">👶 Преемственность</div>
      ${heir
        ? `<div class="gov-heir">${heir.portrait ?? '👤'} <strong>${heir.name}</strong> · ${heir.age} лет · ❤️ ${heir.health}/100</div>`
        : `<div class="gov-heir-none">⚠️ Наследник не назначен${succession.crisis_if_no_heir ? ' — смерть правителя вызовет кризис!' : ''}</div>`
      }
      ${succession.claim_types?.length
        ? `<div class="gov-claim-types">Права: ${succession.claim_types.map(c => `<span class="gov-tag">${c}</span>`).join('')}</div>`
        : ''}
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────────────
// 8. ЗАГОВОРЫ (тирания)
// ──────────────────────────────────────────────────────────────────────

function renderConspiracyBlock(conspiracies, nation) {
  const chance = Math.round(calculateConspiracyChance(nation) * 100);
  const riskColor = chance > 40 ? '#f44336' : chance > 20 ? '#FF9800' : '#4CAF50';
  const sp = conspiracies.secret_police;

  // Активные (обнаруженные) заговоры из движка
  const nationId = GAME_STATE.player_nation;
  const activeConsp = (GAME_STATE.nations[nationId]?.conspiracies || [])
    .filter(c => c.status === 'detected');

  const detectedHtml = activeConsp.map(cons => {
    const opts = CONSPIRACY_ENGINE.get_player_options(cons.id, nationId);
    const optBtns = opts.map(opt => `
      <button class="gov-consp-action-btn" onclick="resolveConspiracy('${cons.id}','${opt.id}')"
        title="${opt.risk}">${opt.label}</button>
    `).join('');
    return `
      <div class="gov-detected-conspiracy">
        <div class="gov-consp-header">
          ⚠️ <strong>${cons.secret_name || 'Неизвестный заговор'}</strong>
          <span class="gov-consp-stage">обнаружен</span>
        </div>
        <div class="gov-consp-desc dim">${cons.goal_description || 'Свергнуть действующую власть'}</div>
        <div class="gov-consp-members dim">Участников: ~${cons.members?.length ?? '?'} сенаторов</div>
        <div class="gov-consp-actions">${optBtns}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="gov-section">
      <div class="gov-section-title">🗡️ Заговоры</div>
      <div class="gov-conspiracy-row">
        <span class="gov-metric-label">Риск за ход:</span>
        <div class="bar-container"><div class="bar-fill" style="width:${Math.min(100,chance*2)}%;background:${riskColor}"></div></div>
        <span style="color:${riskColor}"><strong>${chance}%</strong></span>
      </div>
      ${sp
        ? `<div class="gov-sp-row ${sp.enabled ? 'active' : 'inactive'}">
            🕵️ Тайная полиция: ${sp.enabled
              ? `<span class="positive">активна (−${sp.cost_per_turn} монет/ход, −${Math.round(sp.conspiracy_detection_bonus*100)}% риска)</span>`
              : '<span class="dim">неактивна</span>'}
            ${!sp.enabled
              ? `<button class="gov-sp-btn" onclick="enableSecretPolice()">Активировать (${sp.cost_per_turn} монет/ход)</button>`
              : `<button class="gov-sp-btn red" onclick="disableSecretPolice()">Расформировать</button>`
            }
          </div>`
        : ''
      }
      ${detectedHtml || ''}
    </div>
  `;
}

async function resolveConspiracy(conspiracyId, outcome) {
  const nationId = GAME_STATE.player_nation;
  const result = await CONSPIRACY_ENGINE.resolve_conspiracy(nationId, conspiracyId, outcome);
  renderGovernmentOverlay();
  renderRightPanel();
}

function enableSecretPolice() {
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const sp = nation.government.conspiracies?.secret_police;
  if (!sp) return;
  sp.enabled = true;
  addEventLog('🕵️ Тайная полиция активирована. Слежка усилена.', 'info');
  renderGovernmentOverlay();
}

function disableSecretPolice() {
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const sp = nation.government.conspiracies?.secret_police;
  if (!sp) return;
  sp.enabled = false;
  addEventLog('🕵️ Тайная полиция расформирована.', 'info');
  renderGovernmentOverlay();
}

// ──────────────────────────────────────────────────────────────────────
// 9. КАСТОМНЫЕ МЕХАНИКИ
// ──────────────────────────────────────────────────────────────────────

function renderCustomMechanicsBlock(mechanics) {
  const items = mechanics.map(m => `
    <div class="gov-custom-mech">
      <span class="gov-mech-name">⚙️ ${m.name}</span>
      <span class="gov-mech-desc">${m.description ?? ''}</span>
      <span class="gov-mech-trigger dim">Срабатывает: ${m.trigger ?? '?'}</span>
    </div>
  `).join('');

  return `
    <div class="gov-section">
      <div class="gov-section-title">⚙️ Особые механики</div>
      ${items}
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────────────
// 10. ИСТОРИЯ ПЕРЕХОДОВ
// ──────────────────────────────────────────────────────────────────────

function renderTransitionHistory(history) {
  if (!history.length) return '';
  const items = history.slice().reverse().slice(0, 4).map(h => {
    const from = h.from ? getGovernmentNameFull(h.from) : 'Начало';
    const to   = getGovernmentNameFull(h.to);
    return `<div class="gov-hist-item">Ход ${h.turn}: ${from} → ${to} · <em>${h.cause}</em></div>`;
  }).join('');
  return `
    <div class="gov-section collapsed">
      <div class="gov-section-title clickable" onclick="this.parentElement.classList.toggle('collapsed')">
        📜 История переходов ▾
      </div>
      <div class="gov-hist-list">${items}</div>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────────────
// 11. ПОЛЕ РЕФОРМЫ (вызывает Claude API)
// ──────────────────────────────────────────────────────────────────────

function renderReformInput() {
  return `
    <div class="gov-reform-section">
      <div class="gov-section-title">✍️ Реформировать правительство</div>
      <div class="gov-reform-hint">
        Опишите свободным текстом. Например: «Ввести выборы стратегов» или «Создать теократию Аполлона»
      </div>
      <div class="gov-reform-row">
        <input
          type="text"
          id="gov-reform-input"
          class="gov-reform-text"
          placeholder="Ваша реформа..."
          onkeydown="if(event.key==='Enter') submitGovernmentReform()"
        >
        <button class="gov-reform-btn" onclick="submitGovernmentReform()">⚖️ Провести</button>
      </div>
      <div id="gov-reform-status" class="gov-reform-status hidden"></div>
    </div>
  `;
}

async function submitGovernmentReform() {
  const input  = document.getElementById('gov-reform-input');
  const status = document.getElementById('gov-reform-status');
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  input.value = '';

  if (status) {
    status.className = 'gov-reform-status';
    status.textContent = '⏳ Claude анализирует реформу...';
  }

  try {
    const delta = await parseGovernmentDescription(text);
    if (delta) {
      applyGovernmentDelta(GAME_STATE.player_nation, delta);
      addEventLog(`⚖️ Реформа принята: "${text}"`, 'positive');
      renderGovernmentOverlay();
      renderLeftPanel();
      if (status) {
        status.className = 'gov-reform-status positive';
        status.textContent = '✅ Реформа применена.';
      }
    }
  } catch (err) {
    console.error('Gov reform error:', err);
    if (status) {
      status.className = 'gov-reform-status error';
      status.textContent = `❌ Ошибка: ${err.message}`;
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// 5.6. КОНСТИТУЦИОННЫЙ СТРОЙ
// ──────────────────────────────────────────────────────────────────────

function renderConstitutionBlock(arch, nation) {
  const votingLabels = { Plutocracy: 'Плутократия', Meritocracy: 'Меритократия', Democracy: 'Демократия' };
  const powerLabels  = { Limited: 'Ограниченные', Standard: 'Стандартные', Dictatorial: 'Диктаторские' };
  return `
    <div class="gov-section">
      <div class="gov-section-title">📜 Конституция</div>
      <div class="gov-constitution-grid">
        <div class="gov-const-row"><span class="gov-metric-label">Мест в Сенате:</span><strong>${arch.senate_capacity}</strong></div>
        <div class="gov-const-row"><span class="gov-metric-label">Срок консула:</span><strong>${arch.consul_term} лет</strong></div>
        <div class="gov-const-row"><span class="gov-metric-label">Выборы каждые:</span><strong>${arch.election_cycle} лет</strong></div>
        <div class="gov-const-row"><span class="gov-metric-label">Полномочия консула:</span><strong>${powerLabels[arch.consul_powers] ?? arch.consul_powers}</strong></div>
        <div class="gov-const-row"><span class="gov-metric-label">Система голосования:</span><strong>${votingLabels[arch.voting_system] ?? arch.voting_system}</strong></div>
        <div class="gov-const-row"><span class="gov-metric-label">Право вето народа:</span><strong>${arch.veto_rights ? '✅ Да' : '❌ Нет'}</strong></div>
      </div>
      <button class="gov-sp-btn" onclick="openConstitutionDialog()" style="margin-top:8px">⚖️ Изменить конституцию</button>
    </div>
  `;
}

function openConstitutionDialog() {
  const nationId = GAME_STATE.player_nation;
  const arch = GAME_STATE.nations[nationId]?.senate_config?.state_architecture;
  if (!arch) return;

  const existing = document.getElementById('constitution-dialog-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'constitution-dialog-overlay';
  overlay.className = 'senate-law-overlay';
  overlay.innerHTML = `
    <div class="senate-law-form" style="max-width:460px">
      <div class="slf-title">📜 Конституционные параметры</div>
      <div class="slf-hint">Изменения вступят в силу немедленно. Радикальные изменения могут вызвать сопротивление сенаторов.</div>

      <label class="slf-label">Мест в Сенате (90–600)
        <input type="number" id="cd-senate-capacity" class="slf-input" min="90" max="600" value="${arch.senate_capacity}">
      </label>
      <label class="slf-label">Срок консула (лет, 1–10)
        <input type="number" id="cd-consul-term" class="slf-input" min="1" max="10" value="${arch.consul_term}">
      </label>
      <label class="slf-label">Цикл выборов (лет, 1–20)
        <input type="number" id="cd-election-cycle" class="slf-input" min="1" max="20" value="${arch.election_cycle}">
      </label>
      <label class="slf-label">Полномочия консула
        <select id="cd-consul-powers" class="slf-select">
          <option value="Limited"      ${arch.consul_powers==='Limited'      ? 'selected' : ''}>Ограниченные</option>
          <option value="Standard"     ${arch.consul_powers==='Standard'     ? 'selected' : ''}>Стандартные</option>
          <option value="Dictatorial"  ${arch.consul_powers==='Dictatorial'  ? 'selected' : ''}>Диктаторские</option>
        </select>
      </label>
      <label class="slf-label">Система голосования
        <select id="cd-voting-system" class="slf-select">
          <option value="Plutocracy"   ${arch.voting_system==='Plutocracy'   ? 'selected' : ''}>Плутократия</option>
          <option value="Meritocracy"  ${arch.voting_system==='Meritocracy'  ? 'selected' : ''}>Меритократия</option>
          <option value="Democracy"    ${arch.voting_system==='Democracy'    ? 'selected' : ''}>Демократия</option>
        </select>
      </label>
      <label class="slf-label" style="flex-direction:row;align-items:center;gap:8px">
        <input type="checkbox" id="cd-veto-rights" ${arch.veto_rights ? 'checked' : ''}>
        Право вето народного трибуна
      </label>

      <div class="slf-buttons">
        <button class="slf-btn-submit" onclick="applyConstitutionChanges()">Применить</button>
        <button class="slf-btn-cancel" onclick="document.getElementById('constitution-dialog-overlay').remove()">Отмена</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function applyConstitutionChanges() {
  const nationId = GAME_STATE.player_nation;
  const arch = GAME_STATE.nations[nationId]?.senate_config?.state_architecture;
  if (!arch) return;

  const cap   = parseInt(document.getElementById('cd-senate-capacity')?.value) || arch.senate_capacity;
  const term  = parseInt(document.getElementById('cd-consul-term')?.value)     || arch.consul_term;
  const cycle = parseInt(document.getElementById('cd-election-cycle')?.value)  || arch.election_cycle;
  const cpow  = document.getElementById('cd-consul-powers')?.value             || arch.consul_powers;
  const vsys  = document.getElementById('cd-voting-system')?.value             || arch.voting_system;
  const veto  = document.getElementById('cd-veto-rights')?.checked ?? arch.veto_rights;

  const changes = [];
  if (cap   !== arch.senate_capacity) { arch.senate_capacity = Math.max(90, Math.min(600, cap)); changes.push(`Мест в Сенате: ${arch.senate_capacity}`); }
  if (term  !== arch.consul_term)     { arch.consul_term     = Math.max(1,  Math.min(10, term)); changes.push(`Срок консула: ${arch.consul_term} лет`); }
  if (cycle !== arch.election_cycle)  { arch.election_cycle  = Math.max(1,  Math.min(20, cycle)); changes.push(`Цикл выборов: ${arch.election_cycle} лет`); }
  if (cpow  !== arch.consul_powers)   { arch.consul_powers   = cpow;  changes.push(`Полномочия: ${cpow}`); }
  if (vsys  !== arch.voting_system)   { arch.voting_system   = vsys;  changes.push(`Голосование: ${vsys}`); }
  if (veto  !== arch.veto_rights)     { arch.veto_rights     = veto;  changes.push(`Вето: ${veto ? 'Да' : 'Нет'}`); }

  if (changes.length) {
    addEventLog(`📜 Конституционные изменения: ${changes.join('; ')}.`, 'law');
  }

  document.getElementById('constitution-dialog-overlay')?.remove();
  renderGovernmentOverlay();
}

// ──────────────────────────────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ──────────────────────────────────────────────────────────────────────

function getGovTypeIcon(type) {
  const icons = {
    tyranny:   '⚔️',
    monarchy:  '👑',
    republic:  '⚖️',
    oligarchy: '💰',
    democracy: '🗳️',
    tribal:    '🏕️',
    theocracy: '🕊️',
    custom:    '⚙️',
  };
  return icons[type] ?? '🏛';
}

function getInstTypeLabel(type) {
  const labels = {
    legislative: 'Законодательный',
    executive:   'Исполнительный',
    judicial:    'Судебный',
    military:    'Военный',
    religious:   'Религиозный',
    advisory:    'Совещательный',
  };
  return labels[type] ?? type;
}

function getDecisionMethodLabel(method) {
  const labels = {
    majority_vote:    'Голосование большинством',
    unanimous:        'Единогласно',
    single_person:    'Единолично',
    weighted_by_wealth: 'По весу богатства',
    random_oracle:    'Оракул решает',
  };
  return labels[method] ?? method;
}

function formatVoters(s) {
  const map = {
    male_citizens:  'мужчины-граждане',
    all_citizens:   'все граждане',
    council_only:   'только совет',
    landowners:     'землевладельцы',
  };
  return map[s] ?? s ?? '?';
}

// ══════════════════════════════════════════════════════════════════════
// ЗАЛЫ ВЛАСТИ — адаптивная система для всех форм правления
// ══════════════════════════════════════════════════════════════════════

const FACTION_HALL_COLORS = {
  // Республика
  'Оптиматы':              '#8B4513',
  'Популяры':              '#1565C0',
  'Новые люди':            '#2E7D32',
  // Карфаген (олигархия)
  'Клан Баркидов':         '#8B0000',
  'Торговый совет':        '#1B5E20',
  'Жреческая коллегия':    '#4A148C',
  'Земельная аристократия':'#4E342E',
};

const FACTION_AUTO_COLORS = ['#3A86D4','#D44040','#3EA858','#D4942A','#9B5DC4','#38A0A0','#C4704A','#5C5CC4'];

function getFactionColor(name, idx) {
  return FACTION_HALL_COLORS[name] ?? FACTION_AUTO_COLORS[idx % FACTION_AUTO_COLORS.length];
}

const HALL_META = {
  tyranny:    { icon: '⚔️',  name: 'Тронный зал',         btnLabel: '⚔️ Войти в тронный зал',        css: 'hall-tyranny'   },
  monarchy:   { icon: '👑',  name: 'Королевский двор',    btnLabel: '👑 Войти в королевский двор',   css: 'hall-monarchy'  },
  republic:   { icon: '🏛',  name: 'Зал Сената',          btnLabel: '🏛 Войти в зал Сената',         css: 'hall-republic'  },
  oligarchy:  { icon: '💰',  name: 'Торговый совет',      btnLabel: '💰 Войти в торговый совет',     css: 'hall-oligarchy' },
  democracy:  { icon: '🗳️', name: 'Народное собрание',   btnLabel: '🗳️ Открыть народное собрание', css: 'hall-democracy' },
  tribal:     { icon: '🏕',  name: 'Совет старейшин',     btnLabel: '🏕 Сесть у костра старейшин',  css: 'hall-tribal'    },
  theocracy:  { icon: '🕊️', name: 'Жреческий синод',     btnLabel: '🕊️ Войти в жреческий синод',  css: 'hall-theocracy' },
  custom:     { icon: '⚙️',  name: 'Кастомный зал',       btnLabel: '⚙️ Настроить зал власти',      css: 'hall-custom'    },
};

function getDispositionIcon(disp) {
  if (disp >= 70) return '😄';
  if (disp >= 55) return '🙂';
  if (disp >= 40) return '😐';
  if (disp >= 25) return '😒';
  return '😠';
}

// ── ГЛАВНЫЙ РЕНДЕР ЗАЛА ──────────────────────────────────────────────
function renderGovernmentHall(gov, nation) {
  const meta = HALL_META[gov.type] ?? HALL_META.custom;
  return `
    <div class="gov-section">
      <div class="gov-section-title">${meta.icon} ${meta.name}</div>
      <button class="hall-entry-btn" onclick="toggleGovernmentHall('${gov.type}')">
        ${meta.btnLabel}
      </button>
      <div id="gov-hall-container" style="display:none"></div>
    </div>
  `;
}

function toggleGovernmentHall(govType) {
  const container = document.getElementById('gov-hall-container');
  if (!container) return;
  if (container.style.display !== 'none') { container.style.display = 'none'; return; }

  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const gov    = nation.government;
  const meta   = HALL_META[govType] ?? HALL_META.custom;

  container.innerHTML = `<div class="${meta.css}">${buildHallContent(gov, nation, govType)}</div>`;
  container.style.display = 'block';
}

function buildHallContent(gov, nation, govType) {
  switch (govType) {
    case 'tyranny':   return buildThroneRoomContent(gov, nation);
    case 'monarchy':  return buildRoyalCourtContent(gov, nation);
    case 'republic':  return buildSenateContent(gov, nation);
    case 'oligarchy': return buildTradeCouncilContent(gov, nation);
    case 'democracy': return buildPeoplesAssemblyContent(gov, nation);
    case 'tribal':    return buildElderCouncilContent(gov, nation);
    case 'theocracy': return buildPriestlySynodContent(gov, nation);
    case 'custom':    return buildCustomHallContent(gov, nation);
    default:          return buildSenateContent(gov, nation);
  }
}

// ── ВСПОМОГАТЕЛЬНЫЕ ──────────────────────────────────────────────────
function getHallActors(gov, nation) {
  // Ищем персонажей из всех институтов
  const allIds = new Set();
  for (const inst of (gov.institutions ?? [])) {
    (inst.character_ids ?? []).forEach(id => allIds.add(id));
  }
  (gov.ruler?.character_ids ?? []).forEach(id => allIds.add(id));
  return (nation.characters ?? []).filter(c => allIds.has(c.id));
}

function getActorsNoIds(gov, nation) {
  // Если нет character_ids — возвращаем всех персонажей нации
  const actors = getHallActors(gov, nation);
  if (actors.length) return actors;
  return nation.characters ?? [];
}

function renderActorCard(actor, govType) {
  const disp = actor.disposition ?? 50;
  const dispIcon = getDispositionIcon(disp);

  // Для племени — честь; для монархии — ранг; для всех — лояльность
  let barValue, barColor, barLabel;
  if (govType === 'tribal') {
    barValue = actor.honor ?? actor.traits?.loyalty ?? 50;
    barColor = '#FF9800';
    barLabel = `Честь: ${barValue}`;
  } else {
    barValue = actor.traits?.loyalty ?? 50;
    barColor = barValue > 65 ? '#4CAF50' : barValue > 35 ? '#FF9800' : '#f44336';
    barLabel = `Лоял.: ${barValue}`;
  }

  const wantStr = (actor.wants ?? []).slice(0,1).map(w => formatWant(w)).join('');
  const ambition = (actor.ambition_goal ?? '').replace(/_/g,' ');
  const rankBadge = actor.court_rank
    ? `<span class="hall-court-rank-badge hall-rank-${actor.court_rank}">${['','★ Первый','▲ Второй','◆ Третий'][actor.court_rank] ?? ''}</span>`
    : '';
  const roleLabel = (actor.court_role ?? actor.role ?? '').replace(/_/g,' ');

  return `
    <div class="senator-card" onclick="openActorNegotiation('${actor.id}')">
      <span class="senator-disp">${dispIcon}</span>
      <div class="senator-card-top">
        <span class="senator-portrait">${actor.portrait ?? '👤'}</span>
        <span class="senator-name">${actor.name}</span>
      </div>
      ${rankBadge}
      <div class="senator-meta">${actor.age} лет · ${roleLabel}</div>
      ${wantStr ? `<div class="senator-meta" style="color:#90CAF9">✨ ${wantStr}</div>` : ''}
      <div class="senator-loyalty-bar">
        <div class="senator-loyalty-fill" style="width:${barValue}%;background:${barColor}"></div>
      </div>
      ${ambition ? `<div class="senator-ambition">🎯 ${ambition}</div>` : ''}
    </div>
  `;
}

function renderEmptyHall(msg) {
  return `<div class="gov-text" style="padding:10px 0;color:var(--text-dim)">${msg}</div>`;
}

// ── ТРОННЫЙ ЗАЛ (тирания) ────────────────────────────────────────────
function buildThroneRoomContent(gov, nation) {
  const ruler = gov.ruler;
  const power = gov.power_resource?.current ?? 50;
  const actors = getActorsNoIds(gov, nation);

  const rulerHtml = `
    <div class="hall-throne-top">
      <span class="hall-throne-portrait">${ruler.name?.includes('Агаф') ? '👑' : '🗡️'}</span>
      <div>
        <div class="hall-throne-name">${ruler.name ?? 'Тиран'}</div>
        <div class="hall-throne-title">Единовластный правитель</div>
        <div class="hall-throne-power">
          <span class="hall-throne-label">⚡ Страх</span>
          <div class="hall-throne-power-bar">
            <div class="hall-throne-power-fill" style="width:${power}%"></div>
          </div>
          <span class="hall-throne-label">${Math.round(power)}/100</span>
        </div>
      </div>
    </div>
  `;

  if (!actors.length) return rulerHtml + renderEmptyHall('Приближённых нет. Используйте ✨ Созвать советников.');

  const cards = actors.map(a => renderActorCard(a, 'tyranny')).join('');
  return `
    ${rulerHtml}
    <div class="hall-inner-circle">⚔️ Ближний круг — приближённые тирана</div>
    <div class="senate-senators-grid">${cards}</div>
  `;
}

// ── КОРОЛЕВСКИЙ ДВОР (монархия) ───────────────────────────────────────
function buildRoyalCourtContent(gov, nation) {
  const actors = getActorsNoIds(gov, nation);
  if (!actors.length) return renderEmptyHall('Придворные не назначены. Используйте ✨ Созвать советников.');

  // Сортируем по court_rank (1 — ближайший к трону)
  const sorted = [...actors].sort((a,b) => (a.court_rank ?? 99) - (b.court_rank ?? 99));

  const cards = sorted.map(a => renderActorCard(a, 'monarchy')).join('');
  return `
    <div class="hall-inner-circle">👑 Иерархия двора — от ближайшего к трону</div>
    <div class="senate-senators-grid">${cards}</div>
  `;
}

// ── ЗАЛ СЕНАТА (республика) ──────────────────────────────────────────
function buildSenateContent(gov, nation) {
  const insts = gov.institutions ?? [];

  // Институт с реальными персонажами (для интерактивных мест)
  const charInst    = insts.find(i => i.character_ids?.length) ?? null;
  // Институт с данными о фракциях и числе мест (может быть другим)
  const factionInst = insts.find(i => i.factions?.some(f => f.seats)) ?? charInst;

  const senators = charInst
    ? (nation.characters ?? []).filter(c => charInst.character_ids.includes(c.id))
    : (nation.characters ?? []);

  if (!senators.length && !factionInst?.factions?.length)
    return renderEmptyHall('Членов нет. Используйте ✨ Созвать советников.');

  // Строим группы фракций из того института, где есть данные о местах
  const rawFactions = factionInst?.factions ?? [];
  const byFaction   = {};

  if (rawFactions.length) {
    for (const f of rawFactions) byFaction[f.name] = { faction: f, senators: [] };
  } else {
    byFaction[''] = { faction: { name: 'Сенат' }, senators: [] };
  }

  // Привязываем реальных персонажей к фракциям
  const unassigned = [];
  for (const s of senators) {
    const key = s.faction_name ?? '';
    if (byFaction[key] !== undefined) byFaction[key].senators.push(s);
    else unassigned.push(s);
  }

  // Нераспределённых раздаём: сначала по одному на каждую пустую фракцию,
  // потом остатки — в первую фракцию
  if (unassigned.length) {
    const keys = Object.keys(byFaction);
    let ui = 0;
    // Первый проход: каждой фракции без персонажей — по одному лидеру
    for (const key of keys) {
      if (ui >= unassigned.length) break;
      if (byFaction[key].senators.length === 0)
        byFaction[key].senators.push(unassigned[ui++]);
    }
    // Остальные → в первую фракцию
    for (; ui < unassigned.length; ui++)
      byFaction[keys[0]].senators.push(unassigned[ui]);
  }

  const groups  = Object.values(byFaction);
  const total   = groups.reduce((s, g) => s + (g.faction.seats ?? g.senators.length), 0);
  const majority = Math.floor(total / 2) + 1;

  const svgHtml = _buildParliamentSVG(groups, total);

  const legend = groups.map(({ faction, senators: sns }, gi) => {
    const color       = getFactionColor(faction.name || 'Сенат', gi);
    const seatCount   = faction.seats ?? sns.length;
    const leader      = sns.find(s => s.id === faction.leader_id) ?? sns[0] ?? null;
    const leaderFirst = leader?.name?.split(' ')[0] ?? '';
    return `
      <div class="parl-faction-row">
        <span class="parl-faction-dot" style="background:${color}"></span>
        <span class="parl-faction-name">${faction.name || 'Сенат'}</span>
        <span class="parl-faction-count">${seatCount}</span>
        ${leader ? `<button class="parl-leader-btn" onclick="openActorNegotiation('${leader.id}')"
          title="Переговоры с лидером фракции">${leader.portrait ?? '👤'} ${leaderFirst}</button>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="parliament-container">
      <div class="parliament-header">
        <span class="parliament-title">Зал Сената · ${total} мест</span>
        <span class="parliament-majority">Для большинства: ${majority}</span>
      </div>
      ${svgHtml}
      <div class="parl-legend">${legend}</div>
    </div>`;
}

function _buildParliamentSVG(groups, total) {
  const W = 340, H = 195;
  const cx = W / 2, cy = H - 6;
  const SEP = total > 60 ? 14 : total > 30 ? 17 : 20; // плотность зависит от числа мест

  // Ряды: радиусы от внутреннего к внешнему
  const rowRadii = [];
  for (let r = 48; r <= 178; r += (SEP + 5)) rowRadii.push(r);

  const caps = rowRadii.map(r => Math.max(3, Math.floor(Math.PI * r / SEP)));

  // Распределяем полное число мест по рядам
  const rows = [];
  let rem = total;
  for (let i = 0; i < rowRadii.length && rem > 0; i++) {
    const n = Math.min(rem, caps[i]);
    rows.push({ r: rowRadii[i], n });
    rem -= n;
  }

  // Плоский список всех мест: сначала реальные персонажи, потом анонимные
  const allSeats = [];
  groups.forEach((g, gi) => {
    const color       = getFactionColor(g.faction.name || 'Сенат', gi);
    const seatCount   = g.faction.seats ?? g.senators.length;
    const namedIds    = new Set(g.senators.map(s => s.id));
    const leaderId    = g.faction.leader_id ?? g.senators[0]?.id ?? null;

    // Реальные персонажи
    for (const s of g.senators) {
      allSeats.push({ color, id: s.id, name: s.name,
                      interactive: true, isLeader: s.id === leaderId });
    }
    // Анонимные кресла до нужного числа мест
    for (let i = g.senators.length; i < seatCount; i++) {
      allSeats.push({ color, id: null,
                      name: `${g.faction.name || 'Сенат'} · сенатор`,
                      interactive: false, isLeader: false });
    }
  });

  // Размещаем кресла по рядам
  const SR_NAMED = 7, SR_ANON = 5.5;
  let idx = 0;
  const circles = [];
  for (const row of rows) {
    for (let i = 0; i < row.n; i++) {
      const angle = Math.PI * (1 - (i + 0.5) / row.n);
      const x = +(cx + row.r * Math.cos(angle)).toFixed(1);
      const y = +(cy - row.r * Math.sin(angle)).toFixed(1);
      const seat = allSeats[idx++];
      if (!seat) break;

      if (seat.interactive) {
        const ring = seat.isLeader
          ? `stroke="#FFD700" stroke-width="2.5"`
          : `stroke="rgba(255,255,255,0.5)" stroke-width="1.2"`;
        circles.push(
          `<circle cx="${x}" cy="${y}" r="${SR_NAMED}" fill="${seat.color}" ${ring} ` +
          `class="parl-seat" onclick="openActorNegotiation('${seat.id}')">` +
          `<title>${seat.name}${seat.isLeader ? ' ★ лидер' : ''}</title></circle>`
        );
      } else {
        circles.push(
          `<circle cx="${x}" cy="${y}" r="${SR_ANON}" fill="${seat.color}" ` +
          `opacity="0.55" stroke="rgba(0,0,0,0.25)" stroke-width="0.5">` +
          `<title>${seat.name}</title></circle>`
        );
      }
    }
  }

  const baseY = (cy + 2).toFixed(1);
  const base  = `<line x1="0" y1="${baseY}" x2="${W}" y2="${baseY}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;

  return `<svg viewBox="0 0 ${W} ${H}" class="parliament-svg">${base}${circles.join('')}</svg>`;
}

// ── ТОРГОВЫЙ СОВЕТ (олигархия) ────────────────────────────────────────
function buildTradeCouncilContent(gov, nation) {
  const actors = getActorsNoIds(gov, nation);
  if (!actors.length) return renderEmptyHall('Члены совета не назначены. Используйте ✨ Созвать советников.');

  const totalGold = actors.reduce((s,a) => s + (a.resources?.gold ?? 0), 1);

  // Полоска влияния по богатству
  const segs = actors.map((a, i) => {
    const pct   = Math.round((a.resources?.gold ?? 0) / totalGold * 100);
    const colors = ['#4CAF50','#2196F3','#FF9800','#9C27B0','#f44336','#00BCD4'];
    const color  = colors[i % colors.length];
    return `<div class="hall-influence-seg" style="width:${pct}%;background:${color}" title="${a.name}: ${pct}% влияния"></div>`;
  }).join('');

  // Фракционные группы, если есть
  const byFaction = {};
  for (const a of actors) {
    const key = a.faction_name ?? '─';
    if (!byFaction[key]) byFaction[key] = [];
    byFaction[key].push(a);
  }
  const hasFactions = Object.keys(byFaction).length > 1 || !byFaction['─'];

  let cardsHtml;
  if (hasFactions) {
    cardsHtml = Object.entries(byFaction).map(([fName, members]) => {
      const color = FACTION_HALL_COLORS[fName] ?? '#2E7D32';
      const cards = members.map(a => renderActorCard(a, 'oligarchy')).join('');
      return `
        <div class="senate-faction-group">
          <div class="senate-faction-header" style="background:${color}22;border-left:3px solid ${color}">
            <span style="color:${color}">●</span><span>${fName}</span>
          </div>
          <div class="senate-senators-grid">${cards}</div>
        </div>`;
    }).join('');
  } else {
    const cards = actors.map(a => renderActorCard(a, 'oligarchy')).join('');
    cardsHtml = `<div class="senate-senators-grid hall-council-table">${cards}</div>`;
  }

  return `
    <div class="hall-influence-ring">${segs}</div>
    <div class="hall-inner-circle">💰 Доля влияния пропорциональна состоянию</div>
    ${cardsHtml}
  `;
}

// ── НАРОДНОЕ СОБРАНИЕ (демократия) ────────────────────────────────────
function buildPeoplesAssemblyContent(gov, nation) {
  const pop   = nation.population ?? {};
  const happy = pop.happiness ?? 50;
  const prof  = pop.by_profession ?? {};

  const groups = [
    { id:'farmers',   icon:'🌾', name:'Земледельцы', size:prof.farmers??0,   want:'land_reform',     fear:'drought'       },
    { id:'craftsmen', icon:'⚒️', name:'Ремесленники',size:prof.craftsmen??0, want:'fair_wages',      fear:'import_goods'  },
    { id:'merchants', icon:'⚖️', name:'Торговцы',    size:prof.merchants??0, want:'free_trade',      fear:'war'           },
    { id:'soldiers',  icon:'⚔️', name:'Воины',       size:prof.soldiers??0,  want:'military_glory',  fear:'defeat'        },
    { id:'clergy',    icon:'🏛️', name:'Жрецы',       size:prof.clergy??0,    want:'temple_funds',    fear:'sacrilege'     },
  ].filter(g => g.size > 0);

  if (!groups.length) return renderEmptyHall('Нет данных о населении.');

  const rows = groups.map(g => {
    const sat = happy + Math.round((Math.random() * 10 - 5));
    const satColor = sat > 65 ? '#4CAF50' : sat > 40 ? '#FF9800' : '#f44336';
    const fmtSize = g.size > 999999 ? (g.size/1000000).toFixed(1)+'М' : g.size > 999 ? Math.round(g.size/1000)+'К' : g.size;
    return `
      <div class="hall-pop-group" onclick="openGroupNegotiation('${g.id}','${gov.type}')">
        <span class="hall-pop-icon">${g.icon}</span>
        <div class="hall-pop-info">
          <div class="hall-pop-name">${g.name}</div>
          <div class="hall-pop-size">${fmtSize} чел.</div>
          <div class="hall-pop-want">✨ ${formatWant(g.want)}</div>
        </div>
        <div class="hall-pop-sat-bar">
          <div class="hall-pop-sat-outer">
            <div class="hall-pop-sat-fill" style="width:${sat}%;background:${satColor}"></div>
          </div>
          <div class="hall-pop-sat-val">${sat}%</div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="hall-inner-circle">🗳️ Голосуют блоки граждан</div>
    <div class="hall-democracy-groups">${rows}</div>
  `;
}

// ── СОВЕТ СТАРЕЙШИН (племя) ───────────────────────────────────────────
function buildElderCouncilContent(gov, nation) {
  const actors = getActorsNoIds(gov, nation);
  if (!actors.length) return renderEmptyHall('Старейшины не назначены. Используйте ✨ Созвать советников.');

  const cards = actors.map(a => renderActorCard(a, 'tribal')).join('');
  return `
    <div class="hall-campfire">🔥 🪨 🔥</div>
    <div class="hall-tribal-circle">${cards}</div>
    <div class="hall-inner-circle">🏕 Решения принимаются у священного костра</div>
  `;
}

// ── ЖРЕЧЕСКИЙ СИНОД (теократия) ───────────────────────────────────────
function buildPriestlySynodContent(gov, nation) {
  const actors = getActorsNoIds(gov, nation);
  if (!actors.length) return renderEmptyHall('Жрецы не назначены. Используйте ✨ Созвать советников.');

  const sorted = [...actors].sort((a,b) => (a.court_rank??99)-(b.court_rank??99));
  const cards  = sorted.map(a => {
    const rankLabel = a.court_rank === 1 ? 'Верховный жрец' : a.court_rank === 2 ? 'Жрец высшего круга' : 'Жрец';
    return `
      <div class="senator-card" onclick="openActorNegotiation('${a.id}')">
        <span class="senator-disp">${getDispositionIcon(a.disposition??50)}</span>
        <div class="senator-card-top">
          <span class="senator-portrait">${a.portrait??'🕊️'}</span>
          <span class="senator-name">${a.name}</span>
        </div>
        <div class="hall-priest-rank">${rankLabel}</div>
        <div class="senator-meta">${(a.court_role??'').replace(/_/g,' ')}</div>
        <div class="senator-loyalty-bar">
          <div class="senator-loyalty-fill" style="width:${a.traits?.piety??50}%;background:#FFD700"></div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="hall-synod-altar">🕊️ ✝ 🕊️</div>
    <div class="senate-senators-grid">${cards}</div>
    <div class="hall-inner-circle">🙏 Все решения освящаются именем богов</div>
  `;
}

// ── КАСТОМНЫЙ ЗАЛ ────────────────────────────────────────────────────
function buildCustomHallContent(gov, nation) {
  const custom = gov.custom_hall;

  if (custom?.actors?.length) {
    // Показываем сконфигурированных акторов
    const cards = custom.actors.map(a => `
      <div class="senator-card" style="cursor:default">
        <div class="senator-card-top">
          <span class="senator-portrait">${a.icon ?? '👤'}</span>
          <span class="senator-name">${a.name}</span>
        </div>
        <div class="senator-meta">${(a.role??'').replace(/_/g,' ')}</div>
      </div>`).join('');
    return `
      <div class="hall-inner-circle">${custom.icon??'⚙️'} ${custom.hall_name??'Кастомный зал'}</div>
      <div class="custom-hall-actors-display">${cards}</div>
      <button class="custom-hall-add-btn" onclick="openCustomHallBuilder()">✏️ Редактировать структуру</button>`;
  }

  return renderCustomHallBuilder(gov, nation);
}

function renderCustomHallBuilder(gov, nation) {
  return `
    <div class="custom-hall-builder" id="custom-hall-builder">
      <div class="custom-hall-builder-title">⚙️ Настройка зала власти</div>
      <div class="custom-hall-field">
        <label class="custom-hall-label">Название зала</label>
        <input class="custom-hall-input" id="ch-name" placeholder="Тайный совет семи...">
      </div>
      <div class="custom-hall-field">
        <label class="custom-hall-label">Иконка зала</label>
        <input class="custom-hall-input" id="ch-icon" placeholder="⚙️" style="width:60px">
      </div>
      <div class="custom-hall-field">
        <label class="custom-hall-label">Механика голосования</label>
        <select class="custom-hall-select" id="ch-mechanic">
          <option value="single_person">Единолично (правитель решает)</option>
          <option value="majority_vote">Голосование большинством</option>
          <option value="weighted_by_wealth">По богатству</option>
          <option value="unanimous">Единогласно</option>
          <option value="ritual">Через ритуал/знамение</option>
        </select>
      </div>
      <div class="custom-hall-field">
        <label class="custom-hall-label">Акторы зала</label>
        <div class="custom-hall-actors" id="ch-actors">
          <div class="custom-hall-actor-row">
            <input class="custom-hall-input custom-hall-actor-input" placeholder="Имя актора..." data-field="name">
            <input class="custom-hall-input" placeholder="Роль..." data-field="role" style="width:80px">
            <input class="custom-hall-input" placeholder="🧙" data-field="icon" style="width:40px">
            <button class="custom-hall-actor-remove" onclick="removeCustomActor(this)">✕</button>
          </div>
        </div>
        <button class="custom-hall-add-btn" onclick="addCustomActorRow()">+ Добавить актора</button>
      </div>
      <button class="custom-hall-save-btn" onclick="saveCustomHall()">💾 Сохранить структуру</button>
    </div>
  `;
}

function addCustomActorRow() {
  const container = document.getElementById('ch-actors');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'custom-hall-actor-row';
  row.innerHTML = `
    <input class="custom-hall-input custom-hall-actor-input" placeholder="Имя актора..." data-field="name">
    <input class="custom-hall-input" placeholder="Роль..." data-field="role" style="width:80px">
    <input class="custom-hall-input" placeholder="🧙" data-field="icon" style="width:40px">
    <button class="custom-hall-actor-remove" onclick="removeCustomActor(this)">✕</button>
  `;
  container.appendChild(row);
}

function removeCustomActor(btn) {
  btn.closest('.custom-hall-actor-row')?.remove();
}

function saveCustomHall() {
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const gov    = nation.government;

  const hallName  = document.getElementById('ch-name')?.value?.trim() || 'Кастомный зал';
  const hallIcon  = document.getElementById('ch-icon')?.value?.trim() || '⚙️';
  const mechanic  = document.getElementById('ch-mechanic')?.value || 'single_person';

  const actorRows = document.querySelectorAll('#ch-actors .custom-hall-actor-row');
  const actors = [];
  actorRows.forEach(row => {
    const name = row.querySelector('[data-field="name"]')?.value?.trim();
    const role = row.querySelector('[data-field="role"]')?.value?.trim();
    const icon = row.querySelector('[data-field="icon"]')?.value?.trim();
    if (name) actors.push({ name, role: role || 'актор', icon: icon || '👤', disposition: 50 });
  });

  gov.custom_hall = { hall_name: hallName, icon: hallIcon, mechanic, actors };

  const container = document.getElementById('gov-hall-container');
  if (container) {
    container.innerHTML = `<div class="hall-custom">${buildCustomHallContent(gov, nation)}</div>`;
  }
}

function openCustomHallBuilder() {
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const container = document.getElementById('gov-hall-container');
  if (container) {
    container.innerHTML = `<div class="hall-custom">${renderCustomHallBuilder(nation.government, nation)}</div>`;
  }
}

// ── ПЕРЕГОВОРЫ С АКТОРОМ ─────────────────────────────────────────────
function openActorNegotiation(charId) {
  const nation  = GAME_STATE.nations[GAME_STATE.player_nation];
  const actor   = (nation.characters ?? []).find(c => c.id === charId);
  if (!actor) return;

  let overlay = document.getElementById('senator-negotiate-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'senator-negotiate-overlay';
    overlay.onclick = e => { if (e.target === overlay) closeActorNegotiation(); };
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = renderActorNegotiationPanel(actor, nation);
  overlay.style.display = 'flex';
}

function closeActorNegotiation() {
  const overlay = document.getElementById('senator-negotiate-overlay');
  if (overlay) overlay.style.display = 'none';
}

// Оставляем старые алиасы для совместимости
function openSenatorNegotiation(charId) { openActorNegotiation(charId); }
function closeSenatorNegotiation()       { closeActorNegotiation(); }

function renderActorNegotiationPanel(actor, nation, extraHtml = '') {
  const govType = nation.government?.type ?? 'tyranny';
  const disp    = actor.disposition ?? 50;
  const dispColor = disp >= 70 ? '#4CAF50' : disp >= 40 ? '#FF9800' : '#f44336';
  const dispIcon  = getDispositionIcon(disp);

  const wantsTags = (actor.wants ?? []).map(w =>
    `<span class="senator-neg-tag want">${formatWant(w)}</span>`).join('');
  const fearsTags = (actor.fears ?? []).map(f =>
    `<span class="senator-neg-tag fear">😰 ${formatWant(f)}</span>`).join('');

  const actions    = getActorActions(actor, govType, nation);
  const actionsHtml = actions.map(a => {
    const chanceClass = a.chance >= 70 ? 'good' : a.chance >= 45 ? 'ok' : 'risky';
    return `
      <button class="senator-action-btn" onclick="executeActorAction('${actor.id}','${a.id}')"
              ${a.disabled ? 'disabled' : ''}>
        <span class="senator-action-title">${a.icon} ${a.label}</span>
        <span class="senator-action-cost">${a.costText}</span>
        <span class="senator-action-chance ${chanceClass}">${a.chance}% успеха</span>
      </button>`;
  }).join('');

  const historyLast = (actor.history ?? []).slice(-2).reverse()
    .map(h => `<div style="font-size:10px;color:var(--text-dim);margin-top:2px">• ${h.event}</div>`).join('');

  const roleLabel = (actor.court_role ?? actor.role ?? '').replace(/_/g,' ');
  const factionStr = actor.faction_name ? ` · ${actor.faction_name}` : '';

  return `
    <div class="senator-negotiate-panel">
      <div class="senator-neg-header">
        <span class="senator-neg-portrait">${actor.portrait ?? '👤'}</span>
        <div class="senator-neg-info">
          <div class="senator-neg-name">${actor.name}</div>
          <div class="senator-neg-faction">${roleLabel}${factionStr} · ${actor.age} лет</div>
        </div>
        <button class="senator-neg-close" onclick="closeActorNegotiation()">✕</button>
      </div>
      <div class="senator-neg-body">
        <div class="senator-neg-desc">${actor.description ?? ''}</div>
        <div class="senator-neg-disp-row">
          <span class="senator-neg-disp-label">${dispIcon} Расположение</span>
          <div class="senator-neg-disp-bar">
            <div class="senator-neg-disp-fill" style="width:${disp}%;background:${dispColor}"></div>
          </div>
          <span class="senator-neg-disp-val">${disp}/100</span>
        </div>
        ${wantsTags ? `<div class="senator-neg-section"><div class="senator-neg-section-title">✨ Желает</div><div class="senator-neg-tags">${wantsTags}</div></div>` : ''}
        ${fearsTags ? `<div class="senator-neg-section"><div class="senator-neg-section-title">😰 Боится</div><div class="senator-neg-tags">${fearsTags}</div></div>` : ''}
        ${actor.ambition_goal ? `<div class="senator-neg-section"><div class="senator-neg-section-title">🎯 Амбиция</div><div style="font-size:11px;color:var(--text-light)">${actor.ambition_goal.replace(/_/g,' ')}</div></div>` : ''}
        <div class="senator-neg-section">
          <div class="senator-neg-section-title">⚔️ Действия</div>
          <div class="senator-neg-actions">${actionsHtml}</div>
        </div>
        <div id="senator-neg-result"></div>
        ${historyLast ? `<div class="senator-neg-section" style="margin-top:8px"><div class="senator-neg-section-title">📜 Недавно</div>${historyLast}</div>` : ''}
        ${extraHtml}
      </div>
    </div>`;
}

function getActorActions(actor, govType, nation) {
  const disp    = actor.disposition ?? 50;
  const greed   = actor.traits?.greed    ?? 50;
  const caution = actor.traits?.caution  ?? 50;
  const piety   = actor.traits?.piety    ?? 50;
  const ambition= actor.traits?.ambition ?? 50;
  const power   = nation.government?.power_resource?.current ?? 50;
  const treasury= nation.economy?.treasury ?? 0;

  const bribeCost   = Math.round(500 + greed * 80);
  const bribeChance = Math.min(90, Math.round(30 + disp * 0.4 + greed * 0.3));
  const dealChance  = Math.min(85, Math.round(20 + disp * 0.6 - caution * 0.15));
  const pressChance = Math.min(70, Math.round(10 + power * 0.5 - caution * 0.2));
  const ritualCost  = Math.round(300 + piety * 30);
  const giftCost    = Math.round(200 + greed * 50);

  const ACTIONS = {
    // Тирания
    give_gift:       { id:'give_gift',       icon:'🎁',  label:'Поднести дар',         costText:`${giftCost} золота`,             chance: Math.min(80, 30+disp*0.4+greed*0.2),  disabled: treasury < giftCost },
    do_favor:        { id:'do_favor',        icon:'🤝',  label:'Оказать услугу',        costText:'Обещание выполнить желание',     chance: dealChance,                            disabled: false },
    flatter:         { id:'flatter',         icon:'🗣',  label:'Польстить',             costText:'Бесплатно (низкий шанс)',        chance: Math.min(50,15+disp*0.25+ambition*0.1),disabled: false },
    intimidate:      { id:'intimidate',      icon:'😤',  label:'Надавить страхом',      costText:`Требует власть ≥20 (есть: ${Math.round(power)})`, chance: pressChance, disabled: power < 20 },
    // Монархия
    request_audience:{ id:'request_audience',icon:'🤝',  label:'Запросить аудиенцию',  costText:'Открыть доступ к монарху',      chance: Math.min(75,15+disp*0.5),              disabled: false },
    court_gift:      { id:'court_gift',      icon:'🎁',  label:'Дар двору',             costText:`${giftCost} золота`,             chance: Math.min(80,25+disp*0.35+greed*0.3),  disabled: treasury < giftCost },
    offer_service:   { id:'offer_service',   icon:'📜',  label:'Предложить службу',     costText:'Обещание ресурсов или помощи',  chance: dealChance,                            disabled: false },
    intrigue:        { id:'intrigue',        icon:'🕵',  label:'Интрига',               costText:'Риск: использовать против другого', chance: Math.min(65,10+disp*0.4-caution*0.2),disabled: false },
    // Республика
    deal:            { id:'deal',            icon:'🤝',  label:'Предложить союз',       costText:'Обещание поддержки желания',    chance: dealChance,                            disabled: false },
    bribe:           { id:'bribe',           icon:'💰',  label:'Подкупить',             costText:`${bribeCost} золота`,            chance: bribeChance,                           disabled: treasury < bribeCost },
    appeal:          { id:'appeal',          icon:'🗣',  label:'Апеллировать',          costText:'Апелляция к интересам (бесплатно)', chance: Math.min(80,25+disp*0.5+ambition*0.1), disabled: false },
    pressure:        { id:'pressure',        icon:'😤',  label:'Надавить',              costText:`Власть ≥20 (есть: ${Math.round(power)})`, chance: pressChance, disabled: power < 20 },
    // Олигархия
    business_deal:   { id:'business_deal',   icon:'💼',  label:'Деловое предложение',  costText:'Торговый союз / контракт',      chance: Math.min(80,20+disp*0.5+greed*0.2),   disabled: false },
    trade_alliance:  { id:'trade_alliance',  icon:'📈',  label:'Торговый союз',         costText:'Долгосрочный альянс',           chance: Math.min(75,15+disp*0.45),             disabled: false },
    econ_pressure:   { id:'econ_pressure',   icon:'📉',  label:'Экон. давление',        costText:'Угроза торговой блокадой',      chance: Math.min(60,10+power*0.4-caution*0.3),disabled: power < 30 },
    // Племя
    tribal_gifts:    { id:'tribal_gifts',    icon:'🎁',  label:'Преподнести дары',      costText:`${giftCost} золота`,             chance: Math.min(85,30+disp*0.4+greed*0.2),  disabled: treasury < giftCost },
    battle_glory:    { id:'battle_glory',    icon:'⚔️',  label:'Боевая слава',          costText:'Упомянуть победы в войне',      chance: Math.min(80,20+disp*0.5+power*0.2),   disabled: false },
    ritual:          { id:'ritual',          icon:'🪶',  label:'Провести обряд',        costText:`${ritualCost} золота`,           chance: Math.min(85,30+piety*0.4+disp*0.3),  disabled: treasury < ritualCost },
    duel_challenge:  { id:'duel_challenge',  icon:'🗡️', label:'Вызов на поединок',     costText:'Высокий риск / высокая награда',chance: Math.min(60,10+power*0.5-caution*0.3),disabled: false },
    // Теократия
    temple_donation: { id:'temple_donation', icon:'🏛',  label:'Пожертвование храму',   costText:`${ritualCost} золота`,           chance: Math.min(85,30+piety*0.45+disp*0.25),disabled: treasury < ritualCost },
    cite_omen:       { id:'cite_omen',       icon:'🔮',  label:'Ссылка на знамение',    costText:'Благоприятное знамение',        chance: Math.min(75,20+piety*0.4+disp*0.2),   disabled: false },
    sponsor_ritual:  { id:'sponsor_ritual',  icon:'📿',  label:'Спонсировать ритуал',   costText:`${ritualCost*2} золота`,         chance: Math.min(90,40+piety*0.4+disp*0.3),  disabled: treasury < ritualCost*2 },
    spiritual_alliance:{id:'spiritual_alliance',icon:'🤝',label:'Духовный союз',       costText:'Общий интерес во имя богов',    chance: Math.min(70,15+piety*0.35+disp*0.35), disabled: false },
  };

  const SETS = {
    tyranny:   ['give_gift','do_favor','flatter','intimidate'],
    monarchy:  ['request_audience','court_gift','offer_service','intrigue'],
    republic:  ['deal','bribe','appeal','pressure'],
    oligarchy: ['business_deal','bribe','trade_alliance','econ_pressure'],
    democracy: ['deal','appeal','give_gift','pressure'],
    tribal:    ['tribal_gifts','battle_glory','ritual','duel_challenge'],
    theocracy: ['temple_donation','cite_omen','sponsor_ritual','spiritual_alliance'],
  };

  const set = SETS[govType] ?? SETS.republic;
  return set.map(id => ACTIONS[id]).filter(Boolean);
}

function executeActorAction(charId, actionId) {
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const actor  = (nation.characters ?? []).find(c => c.id === charId);
  if (!actor) return;

  const govType = nation.government?.type ?? 'tyranny';
  const result  = negotiateActor(charId, GAME_STATE.player_nation, actionId, govType);

  // Применяем изменения
  actor.disposition = Math.max(0, Math.min(100, (actor.disposition ?? 50) + result.disposition_delta));
  if (actor.traits) actor.traits.loyalty = Math.max(0, Math.min(100, (actor.traits.loyalty ?? 50) + result.loyalty_delta));
  if (actor.honor !== undefined) actor.honor = Math.max(0, Math.min(100, actor.honor + (result.loyalty_delta ?? 0)));
  actor.history = actor.history ?? [];
  if (result.history_note) actor.history.push({ turn: GAME_STATE.turn, event: result.history_note });

  if (result.gold_spent > 0 && nation.economy) nation.economy.treasury -= result.gold_spent;

  // Показываем результат
  const resultEl = document.getElementById('senator-neg-result');
  if (resultEl) {
    resultEl.innerHTML = `
      <div class="senator-neg-result ${result.outcome}">
        ${result.message}
        ${result.loyalty_delta !== 0 ? `<div style="font-size:10px;margin-top:4px">
          Лояльность: ${result.loyalty_delta > 0?'+':''}${result.loyalty_delta} ·
          Расположение: ${result.disposition_delta > 0?'+':''}${result.disposition_delta}
        </div>` : ''}
      </div>`;
  }

  // Обновляем зал
  const container = document.getElementById('gov-hall-container');
  if (container && container.style.display !== 'none') {
    const meta = HALL_META[govType] ?? HALL_META.custom;
    container.innerHTML = `<div class="${meta.css}">${buildHallContent(nation.government, nation, govType)}</div>`;
  }

  document.querySelectorAll('.senator-action-btn').forEach(b => b.disabled = true);
}

// Переговоры с народной группой (демократия)
function openGroupNegotiation(groupId, govType) {
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const groups = {
    farmers:   { name:'Земледельцы',  icon:'🌾', wants:['land_reform'], fears:['drought'] },
    craftsmen: { name:'Ремесленники', icon:'⚒️', wants:['fair_wages'],  fears:['import_goods'] },
    merchants: { name:'Торговцы',     icon:'⚖️', wants:['free_trade'],  fears:['war'] },
    soldiers:  { name:'Воины',        icon:'⚔️', wants:['military_glory'], fears:['defeat'] },
    clergy:    { name:'Жрецы',        icon:'🏛️', wants:['temple_funds'], fears:['sacrilege'] },
  };
  const group = groups[groupId];
  if (!group) return;

  const pseudo = {
    id: 'GROUP_' + groupId,
    name: group.name,
    portrait: group.icon,
    age: 0,
    court_role: 'группа_граждан',
    disposition: nation.population?.happiness ?? 50,
    ambition_goal: group.wants[0],
    wants: group.wants,
    fears: group.fears,
    traits: { loyalty: nation.population?.happiness ?? 50, greed: 30, caution: 50, ambition: 40, piety: 40, cruelty: 10 },
    description: `Группа: ${group.name}. Удовлетворённость зависит от законов и решений правителя.`,
    history: [],
  };

  let overlay = document.getElementById('senator-negotiate-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'senator-negotiate-overlay';
    overlay.onclick = e => { if (e.target === overlay) closeActorNegotiation(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = renderActorNegotiationPanel(pseudo, nation);
  overlay.style.display = 'flex';
}

// Удаляем старые senate-специфичные алиасы
function toggleSenateHall(instId) { toggleGovernmentHall(GAME_STATE.nations[GAME_STATE.player_nation]?.government?.type ?? 'republic'); }

// ══════════════════════════════════════════════════════════════════════
// SENATE — Lazy Materialization UI
// ══════════════════════════════════════════════════════════════════════

// Вставляется в renderGovernmentTab после институтов.
function renderSenateLazyBlock(nationId) {
  const mgr = getSenateManager(nationId);
  if (!mgr) return '';

  const stats       = mgr.getFactionStats();
  const materialized = mgr.getMaterialized();
  const matCount     = materialized.length;

  // Берём канонический total из government.institutions (то же что SVG-парламент)
  const _nation2    = GAME_STATE.nations[nationId];
  const _govInsts2  = _nation2?.government?.institutions ?? [];
  const _fInst2     = _govInsts2.find(i => i.factions?.some(f => f.seats));
  const total       = _fInst2
    ? _fInst2.factions.reduce((s, f) => s + (f.seats ?? 0), 0)
    : mgr.senators.length;

  // Фракционная полоска распределения мест
  const factionBars = mgr.factions.map(f => {
    const s = stats[f.id];
    const pct = Math.round((s.seats / total) * 100);
    return `<div class="senate-faction-bar" style="width:${pct}%;background:${f.color};title='${s.name}: ${s.seats} мест'"></div>`;
  }).join('');

  const factionLabels = mgr.factions.map(f => {
    const s = stats[f.id];
    const loyaltyColor = s.avg_loyalty > 60 ? '#4CAF50' : s.avg_loyalty > 35 ? '#FF9800' : '#f44336';
    const leader = mgr.getFactionLeader(f.id);
    const leaderHtml = leader
      ? `<span class="senate-faction-leader" title="Лидер фракции">${leader.portrait ?? '👤'} ${leader.name}</span>`
      : '';
    return `
      <div class="senate-faction-label">
        <span class="senate-faction-dot" style="background:${f.color}"></span>
        <span class="senate-faction-name">${f.name}</span>
        <span class="senate-faction-seats">${s.seats}</span>
        <span class="senate-faction-loyalty" style="color:${loyaltyColor}">~${s.avg_loyalty}%</span>
        ${leaderHtml}
      </div>`;
  }).join('');

  // Карточки материализованных сенаторов
  const matCards = materialized.map(s => {
    const faction    = mgr.factions.find(f => f.id === s.faction_id);
    const isLeader   = faction?.leader_senator_id === s.id;
    const loyColor   = s.loyalty_score > 60 ? '#4CAF50' : s.loyalty_score > 35 ? '#FF9800' : '#f44336';
    const tagHtml    = (s.traits ?? []).map(t =>
      `<span class="senate-tag">${t}</span>`
    ).join('');
    const leaderBadge = isLeader
      ? `<span class="senate-leader-badge" title="Лидер фракции">👑</span>`
      : '';
    const cardClass = isLeader
      ? 'senate-senator-card senate-senator-materialized senate-senator-leader'
      : 'senate-senator-card senate-senator-materialized';
    return `
      <div class="${cardClass}"
           onclick="openSenatorCard('${s.id}', '${nationId}')"
           title="${s.biography ?? ''}">
        <span class="senate-senator-portrait">${s.portrait ?? '👤'}${leaderBadge}</span>
        <div class="senate-senator-info">
          <div class="senate-senator-name">${s.name}</div>
          <div class="senate-senator-tags">${tagHtml}</div>
          <div class="senate-senator-faction" style="color:${faction?.color ?? '#aaa'}">${faction?.name ?? ''}${isLeader ? ' · лидер' : ''}</div>
        </div>
        <div class="senate-senator-loyalty" style="color:${loyColor}">${s.loyalty_score}%</div>
      </div>`;
  }).join('');

  // Карточки призраков (по одной на фракцию — компактный вид)
  const ghostSummary = mgr.factions.map(f => {
    const ghosts = mgr.getGhostsByFaction(f.id);
    if (!ghosts.length) return '';
    // Показываем только одного самого честолюбивого
    const topGhost = ghosts.sort((a, b) => b.ambition_level - a.ambition_level)[0];
    return `
      <div class="senate-senator-card senate-senator-ghost"
           onclick="onSenatorGhostClick('${topGhost.id}', '${nationId}')"
           title="Нажмите, чтобы узнать личность · Фракция: ${f.name}">
        <span class="senate-senator-portrait">❓</span>
        <div class="senate-senator-info">
          <div class="senate-senator-name" style="color:#888">Неизвестен</div>
          <div class="senate-senator-tags">
            <span class="senate-tag senate-tag-dim">Честолюбие: ${'★'.repeat(topGhost.ambition_level)}</span>
          </div>
          <div class="senate-senator-faction" style="color:${f.color}">${f.name} · ещё ${ghosts.length}</div>
        </div>
        <div class="senate-senator-loyalty" style="color:#888">${topGhost.loyalty_score}%</div>
      </div>`;
  }).join('');

  return `
    <div class="gov-section-title">🏛 Сенат (${total} мест)</div>
    <div class="senate-block">

      <div class="senate-mood-bar">
        💬 <em>${mgr.global_senate_state}</em>
      </div>

      <div class="senate-seats-bar">${factionBars}</div>
      <div class="senate-faction-legend">${factionLabels}</div>

      <div class="senate-stats-row">
        <span>Проявлено личностей: <b>${matCount}</b> из ${total}</span>
        <span>Неизвестных: <b>${total - matCount}</b></span>
      </div>

      ${matCards ? `<div class="senate-senators-list">${matCards}</div>` : ''}
      ${ghostSummary ? `<div class="senate-senators-list senate-ghosts">${ghostSummary}</div>` : ''}

      <div style="margin-top:8px;">
        <button onclick="openSenateLawProposal('${nationId}')"
                style="width:100%;padding:7px;background:rgba(100,180,255,0.1);border:1px solid rgba(100,180,255,0.3);
                       border-radius:4px;color:#88ccff;cursor:pointer;font-size:12px;">
          📋 Вынести закон на голосование Сената
        </button>
      </div>

    </div>`;
}

// Клик по призраку — запускает материализацию
async function onSenatorGhostClick(senatorId, nationId) {
  const mgr = getSenateManager(nationId);
  if (!mgr) return;

  const card = event?.currentTarget ?? document.querySelector(`[onclick*="${senatorId}"]`);
  if (card) {
    card.innerHTML = `<span style="padding:8px;color:#aaa">⏳ Выясняем личность…</span>`;
    card.onclick = null;
  }

  const senator = await mgr.materialize_senator(senatorId, 'player_click');

  if (senator?.materialized) {
    addEventLog(`🔍 Вы изучили сенатора: ${senator.name} (${senator.traits?.join(', ')}).`, 'character');
  }

  // Перерисовываем блок
  renderGovernmentOverlay();
}

// Открыть карточку материализованного сенатора
function openSenatorCard(senatorId, nationId) {
  const mgr = getSenateManager(nationId);
  if (!mgr) return;
  const s = mgr.getSenatorById(senatorId);
  if (!s || !s.materialized) return;

  const faction = mgr.factions.find(f => f.id === s.faction_id);
  const loyColor = s.loyalty_score > 60 ? '#4CAF50' : s.loyalty_score > 35 ? '#FF9800' : '#f44336';

  // Используем существующую панель переговоров через pseudo-персонажа
  const pseudo = {
    id:          s.id,
    name:        s.name,
    portrait:    s.portrait ?? '👤',
    age:         0,
    court_role:  `Сенатор · ${faction?.name ?? ''}`,
    disposition: s.loyalty_score,
    ambition_goal: (s.traits ?? []).join(', '),
    wants:       [],
    fears:       [],
    traits: {
      loyalty:   s.loyalty_score,
      ambition:  s.ambition_level * 20,
      greed:     40,
      caution:   50,
      piety:     40,
      cruelty:   10,
    },
    description: s.biography ?? '',
    history:     [],
  };

  const senFaction  = mgr.factions.find(f => f.id === s.faction_id);
  const isLeader    = senFaction?.leader_senator_id === s.id;
  const nation      = GAME_STATE.nations[nationId];
  const bribeAmount = Math.round((s.wealth ?? 3000) * 0.6);
  const canBribe    = (nation.economy?.treasury ?? 0) >= bribeAmount;
  const interests   = [
    ...(s.revealed_interests ?? []),
    ...(s.hidden_interests   ?? []).map(i => `❓${i}`)
  ].join(', ') || '—';

  // Определяем terпение и историю диалога персонажа для отображения
  const charForChat = (nation.characters ?? []).find(c => c.id === s.id);
  const patience    = charForChat?.dialogue?.patience_score ?? 100;
  const patienceColor = patience > 60 ? '#4CAF50' : patience > 30 ? '#FF9800' : '#f44336';
  const chatHistory = (charForChat?.dialogue?.hot_memory ?? []).slice(-10);
  const chatHistoryHtml = chatHistory.map(m => {
    const isPlayer = m.role === 'player';
    return `<div class="dlg-msg ${isPlayer ? 'dlg-player' : 'dlg-char'}">
      <span class="dlg-msg-label">${isPlayer ? '👑 Вы' : s.name}</span>
      <span class="dlg-msg-text">${m.text}</span>
    </div>`;
  }).join('');

  const actionBtns = `
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
      <button style="background:${canBribe ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)'};
                     border:1px solid ${canBribe ? '#FFD700' : '#555'};
                     color:${canBribe ? '#FFD700' : '#888'};
                     padding:5px 10px;border-radius:4px;cursor:${canBribe ? 'pointer' : 'not-allowed'};font-size:11px;"
              onclick="senateBribe('${s.id}','${nationId}',${bribeAmount})"
              ${canBribe ? '' : 'disabled'}>
        💰 Подкупить (${bribeAmount} монет)
      </button>
      <button style="background:rgba(100,180,255,0.1);border:1px solid #4499ff;color:#88ccff;
                     padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;"
              onclick="senateReveal('${s.id}','${nationId}')">
        🔍 Разведать интересы
      </button>
    </div>
    <div style="font-size:10px;color:#777;margin-top:5px;">
      Интересы: ${interests} · Здоровье: ${s.health_points ?? '?'} · Влияние: ${s.influence ?? '?'}
      ${isLeader ? ' · 👑 Лидер фракции' : ''}
    </div>

    <!-- ══ СВОБОДНЫЙ ДИАЛОГ ══ -->
    <div class="dlg-section">
      <div class="dlg-section-header">
        <span class="dlg-section-title">💬 Свободный разговор</span>
        <span class="dlg-patience-bar" title="Терпение персонажа">
          <span style="font-size:10px;color:#aaa;">Терпение:</span>
          <span class="dlg-patience-track">
            <span class="dlg-patience-fill" style="width:${patience}%;background:${patienceColor}"></span>
          </span>
          <span style="font-size:10px;color:${patienceColor}">${patience}%</span>
        </span>
      </div>
      <div class="dlg-history" id="dlg-history-${s.id}">
        ${chatHistoryHtml || '<div class="dlg-empty">Начните разговор — напишите что-нибудь ниже.</div>'}
      </div>
      <div class="dlg-input-row">
        <textarea class="dlg-input" id="dlg-input-${s.id}"
          placeholder="Говорите с ${s.name}... (предложите союз, подкуп, угрозу — своими словами)"
          rows="2" onkeydown="dlgHandleKey(event,'${s.id}','${nationId}')"></textarea>
        <button class="dlg-send-btn" onclick="dlgSend('${s.id}','${nationId}')" title="Отправить (Enter)">➤</button>
      </div>
      <div class="dlg-status" id="dlg-status-${s.id}"></div>
    </div>
  `;

  let overlay = document.getElementById('senator-negotiate-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'senator-negotiate-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.style.display = 'none'; };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = renderActorNegotiationPanel(pseudo, nation, actionBtns);
  overlay.style.display = 'flex';
}

// ── Подкуп сенатора ──────────────────────────────────────────────────
function senateBribe(senatorId, nationId, amount) {
  const mgr    = getSenateManager(nationId);
  const nation = GAME_STATE.nations[nationId];
  if (!mgr || !nation) return;

  if ((nation.economy?.treasury ?? 0) < amount) {
    addEventLog('💸 Казна пуста — подкуп невозможен.', 'warning');
    return;
  }

  const result = mgr.attempt_bribe(senatorId, amount);
  if (result.success || result.scandal) nation.economy.treasury -= amount;

  if (result.success) {
    addEventLog(
      `💰 ${result.senator_name} принял ${amount} монет. Лояльность ${result.loyalty_before}% → ${result.loyalty_after}%.`,
      'good'
    );
    mgr._recalculateSenateState();
  } else if (result.scandal) {
    addEventLog(
      `😱 СКАНДАЛ! ${result.senator_name} разоблачил попытку подкупа. Честь Консула падает.`,
      'danger'
    );
  } else {
    addEventLog(`❌ ${result.senator_name} отказался от золота.`, 'warning');
  }

  document.getElementById('senator-negotiate-overlay').style.display = 'none';
  renderAll();
}

// ── Разведка интересов сенатора ─────────────────────────────────────
function senateReveal(senatorId, nationId) {
  const mgr = getSenateManager(nationId);
  if (!mgr) return;
  const revealed = mgr.reveal_interests(senatorId);
  const senator  = mgr.getSenatorById(senatorId);
  if (revealed.length) {
    addEventLog(
      `🔍 Шпионы раскрыли интересы ${senator?.name ?? '?'}: ${revealed.join(', ')}.`,
      'info'
    );
  } else {
    addEventLog(`🔍 Ничего подозрительного в досье ${senator?.name ?? '?'} не найдено.`, 'info');
  }
  document.getElementById('senator-negotiate-overlay').style.display = 'none';
  renderAll();
}

// ── «Предложить закон в Сенат» — выбор типа ─────────────────────────
function openSenateLawProposal(nationId) {
  let overlay = document.getElementById('senate-law-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'senate-law-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;z-index:2000;';
    overlay.onclick = e => { if (e.target === overlay) overlay.style.display = 'none'; };
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="senate-law-form">
      <div class="slf-title">🏛️ Вынести закон на голосование Сената</div>
      <div class="slf-subtitle">Консул, составьте текст закона и подготовьте речь перед отцами-сенаторами</div>

      <label class="slf-label">Название закона</label>
      <input id="slf-law-name" class="slf-input" type="text" maxlength="80"
             placeholder="Напр.: «О расширении портовых сборов»" />

      <label class="slf-label">Текст и суть закона</label>
      <textarea id="slf-law-text" class="slf-textarea" rows="3"
                placeholder="Опишите, что именно предлагается. Сенат будет читать это."></textarea>

      <label class="slf-label">Категория <span style="color:#888;font-size:10px;">(влияет на фракционное голосование)</span></label>
      <select id="slf-law-type" class="slf-select">
        <option value="trade">🪙 Торговля и рынки</option>
        <option value="war">⚔️ Военные ассигнования</option>
        <option value="build">🏗️ Строительство и инфраструктура</option>
        <option value="taxes">📊 Налоги и финансы</option>
        <option value="religion">🔱 Религия и обряды</option>
        <option value="diplomacy">🤝 Дипломатия</option>
        <option value="reform">⚖️ Административная реформа</option>
      </select>

      <label class="slf-label">Ваша речь перед Сенатом <span style="color:#888;font-size:10px;">(необязательно, но влияет на итог)</span></label>
      <textarea id="slf-law-speech" class="slf-textarea" rows="4"
                placeholder="Отцы-сенаторы! Обращаюсь к вам с этим законом потому...&#10;Упомяните торговлю, войну, народ, традиции — сенаторы заметят."></textarea>

      <div class="slf-btns">
        <button onclick="document.getElementById('senate-law-overlay').style.display='none'"
                class="slf-btn-cancel">Отмена</button>
        <button onclick="submitSenateLaw('${nationId}')" class="slf-btn-submit">
          ⚖️ Войти в зал Сената
        </button>
      </div>
    </div>
  `;
  overlay.style.display = 'flex';
}

function submitSenateLaw(nationId) {
  const nameEl   = document.getElementById('slf-law-name');
  const textEl   = document.getElementById('slf-law-text');
  const typeEl   = document.getElementById('slf-law-type');
  const speechEl = document.getElementById('slf-law-speech');

  const lawName   = (nameEl?.value  ?? '').trim();
  const lawText   = (textEl?.value  ?? '').trim();
  const lawType   = typeEl?.value   ?? 'reform';
  const speech    = (speechEl?.value ?? '').trim();

  if (!lawName) {
    nameEl?.focus();
    nameEl?.classList.add('slf-input-error');
    setTimeout(() => nameEl?.classList.remove('slf-input-error'), 1200);
    return;
  }

  document.getElementById('senate-law-overlay').style.display = 'none';

  const law = {
    id:               `LAW_${String(Date.now()).slice(-6)}`,
    name:             lawName,
    text:             lawText || `Консул выносит на голосование: «${lawName}».`,
    type:             lawType,
    proposed_turn:    GAME_STATE.turn,
    effects_per_turn: {},
    requires_vote:    true,
    vote:             null,
  };

  startSenateDebate(nationId, law, speech);
}

// ══════════════════════════════════════════════════════════════════════
// СВОБОДНЫЙ ДИАЛОГ С ПЕРСОНАЖЕМ
// ══════════════════════════════════════════════════════════════════════

// Enter без Shift — отправить; Shift+Enter — перенос строки
function dlgHandleKey(event, charId, nationId) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    dlgSend(charId, nationId);
  }
}

async function dlgSend(charId, nationId) {
  const input  = document.getElementById(`dlg-input-${charId}`);
  const status = document.getElementById(`dlg-status-${charId}`);
  const history = document.getElementById(`dlg-history-${charId}`);
  if (!input || !status) return;

  const text = input.value.trim();
  if (!text) return;

  // Блокируем кнопку на время запроса
  input.disabled = true;
  status.innerHTML = '<span class="dlg-thinking">⏳ Персонаж обдумывает ответ…</span>';

  try {
    const result = await DIALOGUE_ENGINE.processPlayerInput(charId, text, nationId);

    // Добавляем реплики в DOM
    if (history) {
      // Удаляем плейсхолдер если есть
      const empty = history.querySelector('.dlg-empty');
      if (empty) empty.remove();

      const playerDiv = document.createElement('div');
      playerDiv.className = 'dlg-msg dlg-player';
      playerDiv.innerHTML = `<span class="dlg-msg-label">👑 Вы</span><span class="dlg-msg-text">${_escHtml(text)}</span>`;
      history.appendChild(playerDiv);

      const charDiv = document.createElement('div');
      charDiv.className = `dlg-msg dlg-char${result.blocked ? ' dlg-blocked' : ''}`;
      const nation = GAME_STATE.nations[nationId ?? GAME_STATE.player_nation];
      const char   = (nation?.characters ?? []).find(c => c.id === charId);
      charDiv.innerHTML = `<span class="dlg-msg-label">${char?.name ?? '?'}</span><span class="dlg-msg-text">${_escHtml(result.reply ?? result.error ?? '…')}</span>`;
      history.appendChild(charDiv);

      // Скроллим вниз
      history.scrollTop = history.scrollHeight;
    }

    // Статус-строка: эффекты
    const effectLines = (result.effects ?? []).map(e => {
      if (e.type === 'loyalty')    return `${e.delta > 0 ? '📈' : '📉'} Лояльность ${e.delta > 0 ? '+' : ''}${e.delta}`;
      if (e.type === 'bribe_paid') return `💰 Выплачено ${e.amount} золота`;
      if (e.type === 'tyranny')    return `👁 Тирания +${e.delta}`;
      if (e.type === 'insult')     return `😤 Терпение −20`;
      return '';
    }).filter(Boolean);

    const pColor = (result.patience ?? 100) > 60 ? '#4CAF50' : (result.patience ?? 100) > 30 ? '#FF9800' : '#f44336';
    status.innerHTML = effectLines.length
      ? `<span class="dlg-effects">${effectLines.join(' · ')}</span> <span style="color:${pColor}">Терпение: ${result.patience ?? 100}%</span>`
      : `<span style="color:${pColor}">Терпение: ${result.patience ?? 100}%</span>`;

    input.value = '';
  } catch (err) {
    console.error('[dlgSend]', err);
    status.innerHTML = '<span style="color:#f44">Ошибка связи с персонажем.</span>';
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function _escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
