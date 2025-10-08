export type SidebarOption = 'dashboard' | 'koko-web' | null;

export interface SidebarItem {
  id: SidebarOption;
  label: string;
  icon?: string;
}
