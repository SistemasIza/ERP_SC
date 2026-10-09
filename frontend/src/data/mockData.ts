import { User, Message, Interaction, DashboardStats, ChartDataPoint, MenuOption, Settings } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    phoneNumber: '+1234567890',
    firstInteraction: '2024-01-15T10:30:00Z',
    lastInteraction: '2024-03-07T14:22:00Z',
    totalMessages: 45
  },
  {
    id: '2',
    phoneNumber: '+1234567891',
    firstInteraction: '2024-02-20T08:15:00Z',
    lastInteraction: '2024-03-08T09:10:00Z',
    totalMessages: 23
  },
  {
    id: '3',
    phoneNumber: '+1234567892',
    firstInteraction: '2024-02-28T16:45:00Z',
    lastInteraction: '2024-03-06T11:30:00Z',
    totalMessages: 67
  },
  {
    id: '4',
    phoneNumber: '+1234567893',
    firstInteraction: '2024-03-01T12:00:00Z',
    lastInteraction: '2024-03-08T08:45:00Z',
    totalMessages: 12
  },
  {
    id: '5',
    phoneNumber: '+1234567894',
    firstInteraction: '2024-03-03T14:20:00Z',
    lastInteraction: '2024-03-07T16:55:00Z',
    totalMessages: 34
  },
  {
    id: '6',
    phoneNumber: '+1234567895',
    firstInteraction: '2024-03-05T09:30:00Z',
    lastInteraction: '2024-03-08T10:15:00Z',
    totalMessages: 18
  },
  {
    id: '7',
    phoneNumber: '+1234567896',
    firstInteraction: '2024-03-06T11:00:00Z',
    lastInteraction: '2024-03-07T15:30:00Z',
    totalMessages: 9
  },
  {
    id: '8',
    phoneNumber: '+1234567897',
    firstInteraction: '2024-03-07T13:45:00Z',
    lastInteraction: '2024-03-08T07:20:00Z',
    totalMessages: 5
  }
];

export const mockMessages: Message[] = [
  {
    id: '1',
    userId: '1',
    text: 'Hello',
    sender: 'user',
    timestamp: '2024-03-07T14:20:00Z'
  },
  {
    id: '2',
    userId: '1',
    text: 'Hi! Welcome to our WhatsApp bot. How can I help you today?',
    sender: 'bot',
    timestamp: '2024-03-07T14:20:05Z'
  },
  {
    id: '3',
    userId: '1',
    text: 'I need help with my order',
    sender: 'user',
    timestamp: '2024-03-07T14:21:00Z'
  },
  {
    id: '4',
    userId: '1',
    text: 'I can help you with that. Please select an option:\n1. Track order\n2. Cancel order\n3. Modify order',
    sender: 'bot',
    timestamp: '2024-03-07T14:21:05Z'
  },
  {
    id: '5',
    userId: '1',
    text: '1',
    sender: 'user',
    timestamp: '2024-03-07T14:22:00Z'
  },
  {
    id: '6',
    userId: '1',
    text: 'Please provide your order number.',
    sender: 'bot',
    timestamp: '2024-03-07T14:22:05Z'
  },
  {
    id: '7',
    userId: '2',
    text: 'Hi',
    sender: 'user',
    timestamp: '2024-03-08T09:08:00Z'
  },
  {
    id: '8',
    userId: '2',
    text: 'Hi! Welcome to our WhatsApp bot. How can I help you today?',
    sender: 'bot',
    timestamp: '2024-03-08T09:08:05Z'
  },
  {
    id: '9',
    userId: '2',
    text: 'What are your business hours?',
    sender: 'user',
    timestamp: '2024-03-08T09:09:00Z'
  },
  {
    id: '10',
    userId: '2',
    text: 'We are open Monday to Friday, 9 AM to 6 PM EST.',
    sender: 'bot',
    timestamp: '2024-03-08T09:09:05Z'
  },
  {
    id: '11',
    userId: '2',
    text: 'Thank you!',
    sender: 'user',
    timestamp: '2024-03-08T09:10:00Z'
  },
  {
    id: '12',
    userId: '2',
    text: 'You\'re welcome! Is there anything else I can help you with?',
    sender: 'bot',
    timestamp: '2024-03-08T09:10:05Z'
  }
];

export const mockInteractions: Interaction[] = [
  { id: '1', userId: '1', menuOption: 'Track Order', timestamp: '2024-03-07T14:22:00Z' },
  { id: '2', userId: '2', menuOption: 'Business Hours', timestamp: '2024-03-08T09:09:00Z' },
  { id: '3', userId: '3', menuOption: 'Support', timestamp: '2024-03-06T11:30:00Z' },
  { id: '4', userId: '4', menuOption: 'Track Order', timestamp: '2024-03-08T08:45:00Z' },
  { id: '5', userId: '5', menuOption: 'Product Info', timestamp: '2024-03-07T16:55:00Z' },
  { id: '6', userId: '6', menuOption: 'Track Order', timestamp: '2024-03-08T10:15:00Z' },
  { id: '7', userId: '7', menuOption: 'Support', timestamp: '2024-03-07T15:30:00Z' },
  { id: '8', userId: '8', menuOption: 'Business Hours', timestamp: '2024-03-08T07:20:00Z' }
];

export const mockDashboardStats: DashboardStats = {
  totalUsers: 156,
  totalInteractions: 892,
  messagesToday: 127,
  newUsersToday: 8
};

export const mockMessagesPerDay: ChartDataPoint[] = [
  { date: '2024-03-01', value: 45 },
  { date: '2024-03-02', value: 52 },
  { date: '2024-03-03', value: 48 },
  { date: '2024-03-04', value: 61 },
  { date: '2024-03-05', value: 55 },
  { date: '2024-03-06', value: 73 },
  { date: '2024-03-07', value: 68 },
  { date: '2024-03-08', value: 127 }
];

export const mockMenuOptions: MenuOption[] = [
  { option: 'Track Order', count: 234 },
  { option: 'Support', count: 189 },
  { option: 'Product Info', count: 156 },
  { option: 'Business Hours', count: 142 },
  { option: 'Pricing', count: 98 },
  { option: 'Other', count: 73 }
];

export const mockNewUsersGrowth: ChartDataPoint[] = [
  { date: '2024-03-01', value: 12 },
  { date: '2024-03-02', value: 15 },
  { date: '2024-03-03', value: 18 },
  { date: '2024-03-04', value: 14 },
  { date: '2024-03-05', value: 20 },
  { date: '2024-03-06', value: 16 },
  { date: '2024-03-07', value: 22 },
  { date: '2024-03-08', value: 8 }
];

export const mockInteractionsPerDay: ChartDataPoint[] = [
  { date: '2024-03-01', value: 67 },
  { date: '2024-03-02', value: 72 },
  { date: '2024-03-03', value: 85 },
  { date: '2024-03-04', value: 91 },
  { date: '2024-03-05', value: 78 },
  { date: '2024-03-06', value: 94 },
  { date: '2024-03-07', value: 102 },
  { date: '2024-03-08', value: 156 }
];

export const mockTopFlows: MenuOption[] = [
  { option: 'Order Management', count: 345 },
  { option: 'Customer Support', count: 267 },
  { option: 'Product Catalog', count: 198 },
  { option: 'FAQ', count: 156 },
  { option: 'Contact Info', count: 89 }
];

export const mockActiveUsers: ChartDataPoint[] = [
  { date: '2024-03-01', value: 45 },
  { date: '2024-03-02', value: 48 },
  { date: '2024-03-03', value: 52 },
  { date: '2024-03-04', value: 49 },
  { date: '2024-03-05', value: 56 },
  { date: '2024-03-06', value: 61 },
  { date: '2024-03-07', value: 58 },
  { date: '2024-03-08', value: 67 }
];

export const mockSettings: Settings = {
  botName: 'WhatsApp Support Bot',
  webhookUrl: 'https://api.example.com/webhook',
  systemStatus: 'active'
};
