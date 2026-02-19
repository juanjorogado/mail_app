/**
 * Definiciones centralizadas de iconos SVG
 * Elimina duplicación y facilita mantenimiento
 */

export const ICONS = {
  // Google/Gmail
  GOOGLE: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "circle",
        attrs: { cx: "12", cy: "8", r: "4" }
      },
      {
        type: "path", 
        attrs: { d: "M4 20c0-4 4-6 8-6s8 2 8 6" }
      }
    ]
  },

  // Compose/Write
  COMPOSE: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "line",
        attrs: { x1: "12", y1: "5", x2: "12", y2: "19" }
      },
      {
        type: "line",
        attrs: { x1: "5", y1: "12", x2: "19", y2: "12" }
      }
    ]
  },

  // Search
  SEARCH: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "circle",
        attrs: { cx: "11", cy: "11", r: "6" }
      },
      {
        type: "line",
        attrs: { x1: "20", y1: "20", x2: "16", y2: "16" }
      }
    ]
  },

  // Options/Menu
  OPTIONS: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "circle",
        attrs: { cx: "6", cy: "12", r: "1.5", fill: "currentColor", stroke: "none" }
      },
      {
        type: "circle",
        attrs: { cx: "12", cy: "12", r: "1.5", fill: "currentColor", stroke: "none" }
      },
      {
        type: "circle",
        attrs: { cx: "18", cy: "12", r: "1.5", fill: "currentColor", stroke: "none" }
      }
    ]
  },

  // Navigation
  PREVIOUS: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "polyline",
        attrs: { points: "14 18 8 12 14 6" }
      }
    ]
  },

  NEXT: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "polyline",
        attrs: { points: "10 18 16 12 10 6" }
      }
    ]
  },

  // Email Actions
  REPLY: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "polyline",
        attrs: { points: "9 14 4 9 9 4" }
      },
      {
        type: "path",
        attrs: { d: "M4 9h10a5 5 0 0 1 5 5v7" }
      }
    ]
  },

  FORWARD: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "polyline",
        attrs: { points: "15 14 20 9 15 4" }
      },
      {
        type: "path",
        attrs: { d: "M20 9H10a5 5 0 0 0-5 5v7" }
      }
    ]
  },

  DELETE: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "polyline",
        attrs: { points: "3 6 5 6 21 6" }
      },
      {
        type: "path",
        attrs: { d: "M19 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }
      },
      {
        type: "line",
        attrs: { x1: "10", y1: "11", x2: "10", y2: "17" }
      },
      {
        type: "line",
        attrs: { x1: "14", y1: "11", x2: "14", y2: "17" }
      }
    ]
  },

  // UI Elements
  EDIT: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "path",
        attrs: { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }
      },
      {
        type: "path",
        attrs: { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5a2.121 2.121 0 0 1 3-3z" }
      }
    ]
  },

  LOGOUT: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "path",
        attrs: { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }
      },
      {
        type: "polyline",
        attrs: { points: "16 17 21 12 16 7" }
      }
    ]
  },

  // Status
  LOADING: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "line",
        attrs: { x1: "12", y1: "2", x2: "12", y2: "6" }
      },
      {
        type: "line",
        attrs: { x1: "12", y1: "18", x2: "12", y2: "22" }
      },
      {
        type: "line",
        attrs: { x1: "4.93", y1: "4.93", x2: "7.76", y2: "7.76" }
      },
      {
        type: "line",
        attrs: { x1: "16.24", y1: "16.24", x2: "19.07", y2: "19.07" }
      },
      {
        type: "line",
        attrs: { x1: "4.93", y1: "19.07", x2: "7.76", y2: "16.24" }
      },
      {
        type: "line",
        attrs: { x1: "16.24", y1: "7.76", x2: "19.07", y2: "4.93" }
      }
    ]
  },

  SUCCESS: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "polyline",
        attrs: { points: "20 6 9 17 4 12" }
      }
    ]
  },

  ERROR: {
    viewBox: "0 0 24 24",
    fill: "none",
    elements: [
      {
        type: "circle",
        attrs: { cx: "12", cy: "12", r: "10" }
      },
      {
        type: "line",
        attrs: { x1: "12", y1: "8", x2: "12", y2: "12" }
      },
      {
        type: "line",
        attrs: { x1: "12", y1: "16", x2: "12.01", y2: "16" }
      }
    ]
  }
};
