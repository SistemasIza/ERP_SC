export interface User {
  id: string;
  phoneNumber: string;
  firstInteraction: string;
  lastInteraction: string;
  totalMessages: number;
}

export interface Message {
  id: string;
  userId: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

export interface Interaction {
  id: string;
  userId: string;
  menuOption: string;
  timestamp: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalInteractions: number;
  messagesToday: number;
  newUsersToday: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MenuOption {
  option: string;
  count: number;
}

export interface Settings {
  botName: string;
  webhookUrl: string;
  systemStatus: 'active' | 'inactive';
}
