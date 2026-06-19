<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { DarkroomOrder, ScheduleSlot } from '../types/game';

  export let order: DarkroomOrder | null = null;

  $: scheduleSlots = $gameStore.orderScheduleSlots;

  const timeSlotLabels: Record<string, string> = {
    morning: '上午',
    afternoon: '下午',
    evening: '晚间'
  };

  const timeSlotIcons: Record<string, string> = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌙'
  };

  function getSlotStatus(slot: ScheduleSlot): 'available' | 'limited' | 'full' {
    const ratio = slot.filled / slot.capacity;
    if (ratio >= 1) return 'full';
    if (ratio >= 0.67) return 'limited';
    return 'available';
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'available': return '#10b981';
      case 'limited': return '#f59e0b';
      case 'full': return '#ef4444';
      default: return '#6b7280';
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getMonth() + 1}/${date.getDate()} ${weekdays[date.getDay()]}`;
  }

  function isToday(timestamp: number): boolean {
    const today = new Date();
    const slotDate = new Date(timestamp);
    return today.getFullYear() === slotDate.getFullYear() &&
           today.getMonth() === slotDate.getMonth() &&
           today.getDate() === slotDate.getDate();
  }

  function isSlotSelected(slot: ScheduleSlot): boolean {
    return order?.schedule?.slotId === slot.id;
  }

  function canSchedule(slot: ScheduleSlot): boolean {
    if (!order) return false;
    if (slot.filled >= slot.capacity) return false;
    if (order.status === 'archived' || order.status === 'completed') return false;
    return true;
  }

  function scheduleSlot(slot: ScheduleSlot) {
    if (!order || !canSchedule(slot)) return;
    gameStore.scheduleOrder(order.id, slot.id);
  }

  function groupSlotsByDate(): Array<{ date: number; slots: ScheduleSlot[] }> {
    const grouped: Map<number, ScheduleSlot[]> = new Map();
    
    scheduleSlots.forEach(slot => {
      const dateKey = slot.date;
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(slot);
    });

    return Array.from(grouped.entries())
      .map(([date, slots]) => ({ date, slots: slots.sort((a, b) => {
        const order = { morning: 0, afternoon: 1, evening: 2 };
        return order[a.timeSlot] - order[b.timeSlot];
      })}))
      .sort((a, b) => a.date - b.date);
  }

  function refreshSlots() {
    gameStore.refreshScheduleSlots();
  }
</script>

<div class="develop-schedule">
  <div class="panel-header">
    <h3 class="title">冲洗排期</h3>
    <button class="refresh-btn" on:click={refreshSlots} title="刷新排期">
      🔄
    </button>
  </div>

  {#if !order}
    <div class="empty-state">
      <div class="empty-icon">📅</div>
      <p>选择订单查看排期</p>
    </div>
  {:else}
    {#if order.schedule}
      <div class="current-schedule">
        <div class="schedule-label">当前预约</div>
        <div class="schedule-info">
          <span class="schedule-date">{formatDate(order.schedule.scheduledAt)}</span>
          <span class="schedule-time">{timeSlotLabels[order.schedule.slotId.split('_').pop() || 'morning']}</span>
        </div>
        <div class="schedule-developer">技师：{order.schedule.developer}</div>
      </div>
    {/if}

    <div class="schedule-grid">
      {#each groupSlotsByDate() as dayGroup (dayGroup.date)}
        <div class="day-column" class:today={isToday(dayGroup.date)}>
          <div class="day-header">
            <span class="day-date">{formatDate(dayGroup.date)}</span>
            {#if isToday(dayGroup.date)}
              <span class="today-badge">今天</span>
            {/if}
          </div>
          
          <div class="day-slots">
            {#each dayGroup.slots as slot (slot.id)}
              {@const status = getSlotStatus(slot)}
              {@const statusColor = getStatusColor(status)}
              {@const selected = isSlotSelected(slot)}
              {@const schedulable = canSchedule(slot)}

              <div
                class="time-slot"
                class:selected={selected}
                class:disabled={!schedulable}
                style="--slot-color: {statusColor}"
                on:click={() => scheduleSlot(slot)}
              >
                <div class="slot-header">
                  <span class="slot-icon">{timeSlotIcons[slot.timeSlot]}</span>
                  <span class="slot-name">{timeSlotLabels[slot.timeSlot]}</span>
                </div>
                <div class="slot-capacity">
                  <div class="capacity-bar">
                    <div 
                      class="capacity-fill" 
                      style="width: {(slot.filled / slot.capacity) * 100}%; background: {statusColor}"
                    />
                  </div>
                  <span class="capacity-text" style="color: {statusColor}">
                    {slot.filled}/{slot.capacity}
                  </span>
                </div>
                {#if selected}
                  <span class="selected-indicator">✓</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="schedule-legend">
      <div class="legend-item">
        <span class="legend-dot" style="background: #10b981" />
        <span>充足</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #f59e0b" />
        <span>紧张</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #ef4444" />
        <span>已满</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .develop-schedule {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5) 0%, rgba(20, 12, 8, 0.6) 100%);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 16px;
    padding: 16px;
    backdrop-filter: blur(6px);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .title {
    font-size: 15px;
    font-weight: 600;
    color: #e8c890;
    margin: 0;
    letter-spacing: 1px;
  }

  .refresh-btn {
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.3);
    color: #a89878;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover {
    background: rgba(139, 90, 43, 0.4);
    transform: rotate(180deg);
  }

  .current-schedule {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 14px;
  }

  .schedule-label {
    font-size: 11px;
    color: #10b981;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .schedule-info {
    display: flex;
    gap: 12px;
    margin-bottom: 4px;
  }

  .schedule-date,
  .schedule-time {
    font-size: 14px;
    color: #e8c890;
    font-weight: 500;
  }

  .schedule-developer {
    font-size: 12px;
    color: #8a7a5a;
  }

  .schedule-grid {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .schedule-grid::-webkit-scrollbar {
    height: 6px;
  }

  .schedule-grid::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .schedule-grid::-webkit-scrollbar-thumb {
    background: rgba(139, 90, 43, 0.4);
    border-radius: 3px;
  }

  .day-column {
    flex-shrink: 0;
    width: 120px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .day-column.today .day-header {
    color: #c8a878;
  }

  .day-header {
    text-align: center;
    font-size: 11px;
    color: #6a5a45;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .day-date {
    font-weight: 500;
  }

  .today-badge {
    font-size: 10px;
    background: rgba(200, 150, 80, 0.2);
    color: #c8a878;
    padding: 2px 8px;
    border-radius: 8px;
  }

  .day-slots {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .time-slot {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .time-slot:hover:not(.disabled) {
    border-color: var(--slot-color, rgba(200, 150, 80, 0.4));
    background: rgba(0, 0, 0, 0.35);
    transform: translateY(-2px);
  }

  .time-slot.selected {
    border-color: var(--slot-color, #c8a878);
    background: color-mix(in srgb, var(--slot-color, #c8a878) 15%, transparent);
    box-shadow: 0 0 0 1px var(--slot-color, rgba(200, 150, 80, 0.3));
  }

  .time-slot.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .slot-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  .slot-icon {
    font-size: 16px;
  }

  .slot-name {
    font-size: 12px;
    color: #c8a878;
    font-weight: 500;
  }

  .slot-capacity {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .capacity-bar {
    height: 4px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 2px;
    overflow: hidden;
  }

  .capacity-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .capacity-text {
    font-size: 10px;
    font-weight: 500;
    text-align: right;
  }

  .selected-indicator {
    position: absolute;
    top: 8px;
    right: 8px;
    color: var(--slot-color, #10b981);
    font-size: 14px;
    font-weight: bold;
  }

  .schedule-legend {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #8a7a5a;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .empty-state {
    text-align: center;
    padding: 30px 20px;
    color: #6a5a45;
  }

  .empty-icon {
    font-size: 40px;
    margin-bottom: 10px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 4px 0;
    font-size: 12px;
  }
</style>
