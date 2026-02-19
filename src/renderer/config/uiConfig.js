/**
 * Configuración de UI y selectores CSS
 * Centraliza todos los selectores y clases CSS
 */

export const SELECTORS = {
  // Main containers
  ONBOARDING_SCREEN: "#onboarding-screen",
  MAIN_APP_SCREEN: "#main-app-screen",
  MESSAGE_LIST: "#message-list",
  MESSAGE_DETAIL: "#message-detail",

  // Message elements
  MESSAGE_TITLE: "#message-title",
  MESSAGE_SENDER: "#message-sender",
  MESSAGE_RECIPIENT: "#message-recipient",
  MESSAGE_DATE: "#message-date",
  MESSAGE_BODY: "#message-body",

  // Account elements
  CURRENT_ACCOUNT: "#currentAccount",
  CONNECT_ACCOUNT_BUTTON: "#connect-account-button",
  LOGOUT_BUTTON: "#logout-button",

  // Search elements
  SEARCH_INPUT: "#search-input",
  SEARCH_BUTTON: ".main-content .search-button",

  // Mailbox elements
  MAILBOX_ITEMS: ".mailbox-item",
  COUNT_ALL: "#count-all",
  COUNT_UNREAD: "#count-unread",
  COUNT_TODAY: "#count-today",
  COUNT_FLAGGED: "#count-flagged",

  // Action buttons
  COMPOSE_BUTTON: "#compose-button",
  EDIT_BUTTON: ".mailboxes-section .edit-button",
  OPTIONS_ICON: ".main-content .options-icon",
  MESSAGE_DETAIL_BUTTONS: "#message-detail button",

  // Panel elements
  MAILBOXES_PANEL: "#mailboxesPanel",
  MESSAGE_LIST_PANEL: "#messageListPanel",
  MESSAGE_DETAIL_PANEL: "#messageDetailPanel",
  PANEL_DIVIDERS: ".panel-divider.resizable",

  // Dynamic selectors
  MESSAGE_LIST_TITLE: ".message-list-section h2, .text-lg.font-bold",
  MESSAGE_LIST_COUNT:
    ".message-list-section .text-gray-500, .text-gray-500.text-sm",
  MAILBOX_NAME: (mailboxType) =>
    `.mailbox-item[data-mailbox="${mailboxType}"] span:first-child`,
  MAILBOX_BY_TYPE: (mailboxType) =>
    `.mailbox-item[data-mailbox="${mailboxType}"]`,
};

export const CSS_CLASSES = {
  // Layout
  HIDDEN: "hidden",
  ACTIVE: "active",
  SELECTED: "selected",

  // Message items
  MESSAGE_ITEM: "message-item",
  MESSAGE_HEADER: "message-header",
  MESSAGE_FROM: "message-from",
  MESSAGE_DATE: "message-date",
  MESSAGE_SUBJECT: "message-subject",
  MESSAGE_SNIPPET: "message-snippet",
  MESSAGE_UNREAD: "font-bold",

  // Tailwind utilities
  PADDING: {
    P3: "p-3",
    P4: "p-4",
  },
  BORDERS: {
    BORDER_B: "border-b",
    BORDER_GRAY_200: "border-gray-200",
  },
  INTERACTION: {
    HOVER_BG_GRAY_50: "hover:bg-gray-50",
    CURSOR_POINTER: "cursor-pointer",
  },
  TYPOGRAPHY: {
    TEXT_CENTER: "text-center",
    TEXT_RED_500: "text-red-500",
    TEXT_GRAY_500: "text-gray-500",
    TEXT_SM: "text-sm",
    TEXT_LG: "text-lg",
    FONT_BOLD: "font-bold",
  },
  SPACING: {
    MT_4: "mt-4",
    SPACE_X_4: "space-x-4",
  },
  COLORS: {
    BG_GRAY_50: "bg-gray-50",
  },
  FLEX: {
    FLEX: "flex",
    ITEMS_CENTER: "items-center",
  },
  RESIZING: "resizing",
};

export const MAILBOX_MAPPING = {
  all: "INBOX",
  unread: "UNREAD",
  today: "TODAY",
  flagged: "STARRED",
};

export const UI_CONSTANTS = {
  // Panel sizing
  PANEL_MIN_WIDTH: 200,
  PANEL_MAX_WIDTH: 400,
  DEFAULT_PANEL_WIDTH: 250,

  // Animation durations
  ANIMATION_DURATION: 300,

  // Debounce times
  SEARCH_DEBOUNCE: 300,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};
