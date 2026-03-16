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

  // 4. Ресурс власти
  if (gov.power_resource) {
    sections.push(renderPowerResourceBlock(gov.power_resource, gov));
  }

  // 5. Институты — каждый адаптирован под свой type
  if (gov.institutions?.length) {
    sections.push(`<div class="gov-section-title">🏛 Институты власти</div>`);
    sections.push(gov.institutions.map(inst => renderInstitutionBlock(inst, nation)).join(''));
  }

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
          <div class="gov-metric small">
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
  const memberCount = ruler.character_ids?.length ?? 0;

  // Найти институт-совет/сенат в институтах
  const senateInst = (nation.government?.institutions ?? []).find(
    i => i.character_ids?.length && i.type === 'legislative'
  );

  return `
    <div class="gov-section">
      <div class="gov-section-title">🏛 Правящий орган</div>
      <div class="gov-council-card">
        <div class="gov-council-name">${ruler.name}</div>
        <div class="gov-council-meta">
          Членов: ${memberCount > 0 ? memberCount : 'неизвестно'} ·
          Личная власть главы совета: ${ruler.personal_power ?? 20}/100
        </div>
        <div class="gov-council-note">⚖️ Решения принимаются коллегиально</div>
        ${senateInst ? `<button class="senate-hall-btn" onclick="toggleSenateHall('${senateInst.id}')">🏛 Войти в Зал Сената</button>` : ''}
      </div>
      <div id="senate-hall-${senateInst?.id ?? 'none'}" style="display:none"></div>
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
  if (!inst) return '';

  const typeLabel = getInstTypeLabel(inst.type);
  const methodLabel = getDecisionMethodLabel(inst.decision_method);

  const factionHtml = inst.factions?.length
    ? renderFactionList(inst.factions)
    : '';

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
      ${factionHtml}
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
  const gov    = nation.government;
  const chance = Math.round(calculateConspiracyChance(nation) * 100);
  const riskColor = chance > 40 ? '#f44336' : chance > 20 ? '#FF9800' : '#4CAF50';
  const sp = conspiracies.secret_police;

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
            🕵️ Тайная полиция: ${sp.enabled ? `<span class="positive">активна (−${sp.cost_per_turn} монет/ход, −${Math.round(sp.conspiracy_detection_bonus*100)}% риска)</span>`
                                               : '<span class="dim">неактивна</span>'}
            ${!sp.enabled
              ? `<button class="gov-sp-btn" onclick="enableSecretPolice()">Активировать (${sp.cost_per_turn} монет/ход)</button>`
              : `<button class="gov-sp-btn red" onclick="disableSecretPolice()">Расформировать</button>`
            }
          </div>`
        : ''
      }
    </div>
  `;
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
// ЗАЛ СЕНАТА — раскрываемая панель с сенаторами по фракциям
// ══════════════════════════════════════════════════════════════════════

const FACTION_HALL_COLORS = {
  'Оптиматы':   '#8B4513',
  'Популяры':   '#1565C0',
  'Новые люди': '#2E7D32',
};

function getSenatorDispositionIcon(disp) {
  if (disp >= 70) return '😄';
  if (disp >= 55) return '🙂';
  if (disp >= 40) return '😐';
  if (disp >= 25) return '😒';
  return '😠';
}

function toggleSenateHall(instId) {
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const container = document.getElementById(`senate-hall-${instId}`);
  if (!container) return;

  if (container.style.display !== 'none') {
    container.style.display = 'none';
    return;
  }

  const inst = (nation.government?.institutions ?? []).find(i => i.id === instId);
  if (!inst) return;

  container.innerHTML = renderSenateHall(inst, nation);
  container.style.display = 'block';
}

function renderSenateHall(inst, nation) {
  const senators = (nation.characters ?? []).filter(
    c => inst.character_ids?.includes(c.id)
  );

  if (!senators.length) {
    return `<div class="gov-text" style="padding:10px 0;color:var(--text-dim)">Сенаторы не назначены. Используйте ✨ Созвать советников для генерации персонажей.</div>`;
  }

  // Группируем по faction_name
  const byFaction = {};
  for (const f of (inst.factions ?? [])) {
    byFaction[f.name] = { faction: f, senators: [] };
  }
  // Сенаторы без фракции — в отдельную группу
  for (const s of senators) {
    const key = s.faction_name;
    if (byFaction[key]) {
      byFaction[key].senators.push(s);
    } else {
      if (!byFaction['']) byFaction[''] = { faction: { name: 'Независимые' }, senators: [] };
      byFaction[''].senators.push(s);
    }
  }

  const groups = Object.values(byFaction).filter(g => g.senators.length);

  const groupsHtml = groups.map(({ faction, senators: sns }) => {
    const color = FACTION_HALL_COLORS[faction.name] ?? '#555';
    const leader = sns.find(s => s.id === faction.leader_id);

    const cards = sns.map(s => renderSenatorCard(s, faction.name)).join('');

    return `
      <div class="senate-faction-group">
        <div class="senate-faction-header" style="background:${color}22;border-left:3px solid ${color}">
          <span style="color:${color}">●</span>
          <span>${faction.name}</span>
          ${leader ? `<span style="color:${color};font-size:9px">Лидер: ${leader.name.split(' ')[0]}</span>` : ''}
          <span class="senate-faction-seats">${faction.seats ?? '?'} мест</span>
        </div>
        <div class="senate-senators-grid">${cards}</div>
      </div>
    `;
  }).join('');

  return `<div class="senate-hall">${groupsHtml}</div>`;
}

function renderSenatorCard(senator, factionName) {
  const disp = senator.disposition ?? 50;
  const dispIcon = getSenatorDispositionIcon(disp);
  const loyalty = senator.traits?.loyalty ?? 50;
  const loyaltyColor = loyalty > 65 ? '#4CAF50' : loyalty > 35 ? '#FF9800' : '#f44336';
  const wantsStr = (senator.wants ?? []).slice(0, 1).map(w => formatWant(w)).join('');
  const ambition = senator.ambition_goal ? senator.ambition_goal.replace(/_/g, ' ') : '';

  return `
    <div class="senator-card" onclick="openSenatorNegotiation('${senator.id}')">
      <span class="senator-disp">${dispIcon}</span>
      <div class="senator-card-top">
        <span class="senator-portrait">${senator.portrait ?? '👤'}</span>
        <span class="senator-name">${senator.name}</span>
      </div>
      <div class="senator-meta">${senator.age} лет · ${wantsStr}</div>
      <div class="senator-loyalty-bar">
        <div class="senator-loyalty-fill" style="width:${loyalty}%;background:${loyaltyColor}"></div>
      </div>
      ${ambition ? `<div class="senator-ambition">🎯 ${ambition}</div>` : ''}
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════
// МОДАЛ ПЕРЕГОВОРОВ С СЕНАТОРОМ
// ══════════════════════════════════════════════════════════════════════

function openSenatorNegotiation(charId) {
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const senator = (nation.characters ?? []).find(c => c.id === charId);
  if (!senator) return;

  // Создаём оверлей если нет
  let overlay = document.getElementById('senator-negotiate-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'senator-negotiate-overlay';
    overlay.onclick = e => { if (e.target === overlay) closeSenatorNegotiation(); };
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = renderSenatorNegotiationPanel(senator, nation);
  overlay.style.display = 'flex';
}

function closeSenatorNegotiation() {
  const overlay = document.getElementById('senator-negotiate-overlay');
  if (overlay) overlay.style.display = 'none';
}

function renderSenatorNegotiationPanel(senator, nation) {
  const disp = senator.disposition ?? 50;
  const dispIcon = getSenatorDispositionIcon(disp);
  const dispColor = disp >= 70 ? '#4CAF50' : disp >= 40 ? '#FF9800' : '#f44336';

  const wantsTags = (senator.wants ?? []).map(w =>
    `<span class="senator-neg-tag want">${formatWant(w)}</span>`
  ).join('');
  const fearsTags = (senator.fears ?? []).map(f =>
    `<span class="senator-neg-tag fear">😰 ${formatWant(f)}</span>`
  ).join('');

  const treasury = nation.economy?.treasury ?? 0;
  const actions = getSenatorActions(senator, nation);

  const actionsHtml = actions.map(a => {
    const chanceClass = a.chance >= 70 ? 'good' : a.chance >= 45 ? 'ok' : 'risky';
    return `
      <button class="senator-action-btn" onclick="executeSenatorAction('${senator.id}','${a.id}')"
              ${a.disabled ? 'disabled' : ''}>
        <span class="senator-action-title">${a.icon} ${a.label}</span>
        <span class="senator-action-cost">${a.costText}</span>
        <span class="senator-action-chance ${chanceClass}">${a.chance}% успеха</span>
      </button>
    `;
  }).join('');

  const historyLast = (senator.history ?? []).slice(-2).reverse().map(
    h => `<div style="font-size:10px;color:var(--text-dim);margin-top:2px">• ${h.event}</div>`
  ).join('');

  return `
    <div class="senator-negotiate-panel">
      <div class="senator-neg-header">
        <span class="senator-neg-portrait">${senator.portrait ?? '👤'}</span>
        <div class="senator-neg-info">
          <div class="senator-neg-name">${senator.name}</div>
          <div class="senator-neg-faction">${senator.faction_name ?? '—'} · ${senator.age} лет</div>
        </div>
        <button class="senator-neg-close" onclick="closeSenatorNegotiation()">✕</button>
      </div>
      <div class="senator-neg-body">
        <div class="senator-neg-desc">${senator.description ?? ''}</div>

        <div class="senator-neg-disp-row">
          <span class="senator-neg-disp-label">${dispIcon} Расположение</span>
          <div class="senator-neg-disp-bar">
            <div class="senator-neg-disp-fill" style="width:${disp}%;background:${dispColor}"></div>
          </div>
          <span class="senator-neg-disp-val">${disp}/100</span>
        </div>

        ${wantsTags ? `<div class="senator-neg-section">
          <div class="senator-neg-section-title">✨ Желает</div>
          <div class="senator-neg-tags">${wantsTags}</div>
        </div>` : ''}
        ${fearsTags ? `<div class="senator-neg-section">
          <div class="senator-neg-section-title">😰 Боится</div>
          <div class="senator-neg-tags">${fearsTags}</div>
        </div>` : ''}

        ${senator.ambition_goal ? `
          <div class="senator-neg-section">
            <div class="senator-neg-section-title">🎯 Личная амбиция</div>
            <div style="font-size:11px;color:var(--text-light)">${senator.ambition_goal.replace(/_/g,' ')}</div>
          </div>` : ''}

        <div class="senator-neg-section">
          <div class="senator-neg-section-title">⚔️ Действия</div>
          <div class="senator-neg-actions">${actionsHtml}</div>
        </div>

        <div id="senator-neg-result"></div>

        ${historyLast ? `<div class="senator-neg-section" style="margin-top:8px">
          <div class="senator-neg-section-title">📜 Недавно</div>
          ${historyLast}
        </div>` : ''}
      </div>
    </div>
  `;
}

function getSenatorActions(senator, nation) {
  const disp  = senator.disposition ?? 50;
  const greed = senator.traits?.greed ?? 50;
  const caution = senator.traits?.caution ?? 50;
  const ambition = senator.traits?.ambition ?? 50;
  const treasury = nation.economy?.treasury ?? 0;
  const power = nation.government?.power_resource?.current ?? 50;

  // Шанс успеха базируется на расположении + трейтах
  const bribeCost   = Math.round(500 + greed * 80);
  const bribeChance = Math.min(90, Math.round(30 + disp * 0.4 + greed * 0.3));
  const dealChance  = Math.min(85, Math.round(20 + disp * 0.6 - caution * 0.15));
  const speechChance= Math.min(80, Math.round(25 + disp * 0.5 + ambition * 0.1));
  const pressChance = Math.min(70, Math.round(10 + power * 0.5 - caution * 0.2));

  return [
    {
      id: 'deal',
      icon: '🤝',
      label: 'Предложить союз',
      costText: 'Обещание поддержки одного желания',
      chance: dealChance,
      disabled: false,
    },
    {
      id: 'bribe',
      icon: '💰',
      label: 'Подкупить',
      costText: `${bribeCost} золота (казна: ${treasury})`,
      chance: bribeChance,
      disabled: treasury < bribeCost,
    },
    {
      id: 'appeal',
      icon: '🗣',
      label: 'Апеллировать',
      costText: 'Апелляция к личным интересам (бесплатно)',
      chance: speechChance,
      disabled: false,
    },
    {
      id: 'pressure',
      icon: '😤',
      label: 'Надавить',
      costText: `Использует власть (текущая: ${Math.round(power)})`,
      chance: pressChance,
      disabled: power < 20,
    },
  ];
}

function executeSenatorAction(charId, actionId) {
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const senator = (nation.characters ?? []).find(c => c.id === charId);
  if (!senator) return;

  const result = negotiateSenator(charId, GAME_STATE.player_nation, actionId);

  // Применяем изменения
  senator.disposition = Math.max(0, Math.min(100, (senator.disposition ?? 50) + result.disposition_delta));
  senator.traits.loyalty = Math.max(0, Math.min(100, (senator.traits?.loyalty ?? 50) + result.loyalty_delta));
  senator.history = senator.history ?? [];
  senator.history.push({ turn: GAME_STATE.turn, event: result.history_note });

  if (result.gold_spent > 0) {
    nation.economy.treasury -= result.gold_spent;
  }

  // Показываем результат
  const resultEl = document.getElementById('senator-neg-result');
  if (resultEl) {
    resultEl.innerHTML = `
      <div class="senator-neg-result ${result.outcome}">
        ${result.message}
        ${result.loyalty_delta !== 0 ? `<div style="font-size:10px;margin-top:4px">Лояльность: ${result.loyalty_delta > 0 ? '+' : ''}${result.loyalty_delta} · Расположение: ${result.disposition_delta > 0 ? '+' : ''}${result.disposition_delta}</div>` : ''}
      </div>
    `;
  }

  // Обновляем карточку сенатора в зале (если открыта)
  const inst = (nation.government?.institutions ?? []).find(i => i.character_ids?.includes(charId));
  if (inst) {
    const hallEl = document.getElementById(`senate-hall-${inst.id}`);
    if (hallEl && hallEl.style.display !== 'none') {
      hallEl.innerHTML = renderSenateHall(inst, nation);
    }
  }

  // Блокируем кнопки после действия (один раз за открытие)
  document.querySelectorAll('.senator-action-btn').forEach(b => b.disabled = true);
}
