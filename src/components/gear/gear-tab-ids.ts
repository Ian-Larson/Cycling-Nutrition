export type GearTabValue = 'active' | 'due' | 'history';

export function gearTabId(id: GearTabValue): string {
  return `gear-tab-${id}`;
}

export function gearPanelId(id: GearTabValue): string {
  return `gear-panel-${id}`;
}
