export interface TicketOption {
  label: string;
  value: string;
  description: string;
  prefix: string;
  category: string;
  permissionRole?: string;
  embedTitle: string;
  embedDescription: string;
  embedcolor?: string;
  closedembedColor?: string;
  enableembeds?: boolean;
  MaxTicketsPerUser?: number;
  type?: string;
  buttonLabel?: string;
  url?: string;
  replyContent?: string;
  closedDMMessage?: string;
  closedTitle?: string;
  closedembedFooter?: string;
}

export interface TicketConfig {
  Guild: string;
  PanelId: string;
  embedColor?: string;
  embedTitle?: string;
  embedDescription?: string;
  embedFooter?: string;
  enablefooter?: boolean;
  enableimage?: boolean;
  embedImage?: string;
  enablefields?: boolean;
  addfields?: any[];
  selectMenuPlaceholder?: string;
  enableembeds?: boolean;
  options: TicketOption[];
  customization?: {
    addTimestamp?: boolean;
    mentionUsers?: boolean;
    customResponses?: {
      maxTickets?: string;
      ticketCooldown?: string;
      categoryIdError?: string;
      ticketCreated?: string;
    };
  };
  Arkiv?: {
    enabled: boolean;
    id?: string;
  };
  Ticketloggs?: {
    enabled: boolean;
    channel?: string;
    opemembedDescription?: string;
    openembedcolor?: string;
    closeembedDescription?: string;
    closeembedcolor?: string;
    arkivembedDescription?: string;
    arkivembedcolor?: string;
    deleteembedDescription?: string;
    deleteembedcolor?: string;
    embedFooter?: string;
  };
}

export interface TicketRow {
  Id: number;
  CreatorId: string;
  CreatorUsername: string;
  Category: string;
  ChannelId: string;
  GuildId: string;
  MessageId?: string;
  Status: 'open' | 'closed' | 'archived';
  Reason?: string;
  CreatedAt: Date;
  ClosedAt?: Date;
}

export interface LanguageStrings {
  [key: string]: {
    [key: string]: string;
  };
}

export interface LogData {
  [key: string]: string;
}

export interface DatabaseResult {
  [key: string]: any;
}
